<?php
require '/app/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv('/app/.env');
$kernel = new App\Kernel('dev', false);
$kernel->boot();
$reg = $kernel->getContainer()->get('doctrine');
$poolRepo=new App\Repository\PoolConfigRepository($reg);
$starterRepo=new App\Repository\StarterConfigRepository($reg);
$gameRepo=new App\Repository\GameConfigRepository($reg);
$countryRepo=new App\Repository\Location\CountryProfileRepository($reg);
$names=new App\Service\NameGeneratorService(new App\Service\CountryContent\NamePoolProvider($countryRepo));
$gen=new App\Service\PlayerGenerationService($names,$poolRepo);
$resolver=new App\Service\Economy\EconomyScaleResolver($gameRepo,$starterRepo,$countryRepo,$poolRepo,$gen);
$pool=$poolRepo->getConfig();$sc=$starterRepo->getConfig();$gc=$gameRepo->getConfig();
$k=$gc->getEconomyWageCurveExponentBp()/10000;
$ageRange=$pool->firstTeamAgeRange();
$weights=['GK'=>$pool->getPositionWeightGk(),'DEF'=>$pool->getPositionWeightDef(),'MID'=>$pool->getPositionWeightMid(),'ATT'=>$pool->getPositionWeightAtt()];
$money=fn(int $p)=>'£'.number_format($p/100,2);
$wage=fn(int $micro,float $a)=>intdiv((int)round($micro*($a**$k)),1000000);

foreach (['EN','SC'] as $cc) {
 foreach ([8,1] as $t) {
  $row=$sc->getNpcSquadConfig()[(string)$t];
  $b=$sc->getLeagueAbilityRanges()[$cc][(string)$t];
  $band=['min'=>min((int)$b['min'],(int)$b['max']),'max'=>max((int)$b['min'],(int)$b['max'])];
  $size=max(1,intdiv((int)$row['playerMin']+(int)$row['playerMax'],2));
  $span=$band['max']-$band['min'];
  $sigOld=0.0; for($i=0;$i<$size;$i++) $sigOld+=((int)round($band['min']+$span*$i/($size-1)))**$k;
  $scale=$resolver->resolve($cc,$t);
  $budget=intdiv(intdiv($scale->turnoverPence*$gc->getEconomyWageToTurnoverRatioBp(),10000)*(10000-$gc->getEconomyStaffWageShareBp()),10000);
  $mOld=(int)round(($budget*1000000)/($gc->getEconomyWeeksPerSeason()*$sigOld));
  $mNew=$scale->wageScaleMicroPence;

  echo "\n### $cc tier $t — band {$band['min']}-{$band['max']} (POTENTIAL), reference squad $size\n";
  printf("S_tier: %s -> %s pence per unit of ability^k  (x%.3f)\n", number_format($mOld/1e6,4), number_format($mNew/1e6,4), $mNew/$mOld);
  echo "\n  CURRENT ability   wage/wk BEFORE      wage/wk AFTER\n";
  $ladder=[];
  for($a=$band['min'];$a<=$band['max'];$a++) $ladder[]=$a;
  if (count($ladder)>8) { $ladder=[]; for($i=0;$i<8;$i++) $ladder[]=(int)round($band['min']+$span*$i/7); }
  foreach($ladder as $a) printf("  %6d            %14s     %14s\n",$a,$money($wage($mOld,$a)),$money($wage($mNew,$a)));

  // real generated squad: mean weekly wage before/after + bill vs budget
  $CL=40; $sumOld=0;$sumNew=0;$n=0;$caSum=0;
  for($c=0;$c<$CL;$c++){
    $total=random_int((int)$row['playerMin'],(int)$row['playerMax']);
    $tw=array_sum($weights);$counts=[];$fr=[];$as=0;
    foreach($weights as $p=>$w){$e=$total*$w/$tw;$counts[$p]=(int)floor($e);$fr[$p]=$e-$counts[$p];$as+=$counts[$p];}
    $rem=$total-$as;arsort($fr);foreach(array_keys($fr) as $p){if($rem<=0)break;$counts[$p]++;$rem--;}
    foreach($counts as $pv=>$cnt){$position=App\Enum\PlayerPosition::from($pv);
      for($i=0;$i<$cnt;$i++){$pl=$gen->generate($position,App\Enum\RecruitmentSource::YOUTH_INTAKE,'English',$band,$ageRange);
        $ca=$pl->getCurrentAbility(); $caSum+=$ca; $sumOld+=$wage($mOld,$ca); $sumNew+=$wage($mNew,$ca); $n++; }}
  }
  printf("\n  REAL generated squads (%d clubs, %d players): mean current ability %.2f\n", $CL, $n, $caSum/$n);
  printf("  mean weekly wage : %s  ->  %s\n", $money((int)round($sumOld/$n)), $money((int)round($sumNew/$n)));
  printf("  squad season bill vs player budget : %.1f%%  ->  %.1f%%   (budget %s/season)\n",
    ($sumOld/$CL)*$gc->getEconomyWeeksPerSeason()*100/$budget,
    ($sumNew/$CL)*$gc->getEconomyWeeksPerSeason()*100/$budget, $money($budget));
 }
}
