<?php
// Shared bootstrap for the A10 probes. Run inside the Lando container:
//   cat probe-X.php | lando ssh -c 'cat > /tmp/probe/p.php && php /tmp/probe/p.php'
// PlayerGenerationService and EconomyScaleResolver are private services, so the kernel is
// booted and the collaborators are built by hand off the public `doctrine` alias.
require '/app/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv('/app/.env');
$kernel = new App\Kernel('dev', false); $kernel->boot();
$reg = $kernel->getContainer()->get('doctrine');
$poolRepo    = new App\Repository\PoolConfigRepository($reg);
$starterRepo = new App\Repository\StarterConfigRepository($reg);
$gameRepo    = new App\Repository\GameConfigRepository($reg);
$countryRepo = new App\Repository\Location\CountryProfileRepository($reg);
$names = new App\Service\NameGeneratorService(new App\Service\CountryContent\NamePoolProvider($countryRepo));
$gen   = new App\Service\PlayerGenerationService($names, $poolRepo);
$resolver = new App\Service\Economy\EconomyScaleResolver($gameRepo, $starterRepo, $countryRepo, $poolRepo, $gen);
$pool = $poolRepo->getConfig(); $sc = $starterRepo->getConfig(); $gc = $gameRepo->getConfig();
$k = $gc->getEconomyWageCurveExponentBp() / 10000;
$weeks = $gc->getEconomyWeeksPerSeason();
$ageRange = $pool->firstTeamAgeRange();
$posW = ['GK'=>$pool->getPositionWeightGk(),'DEF'=>$pool->getPositionWeightDef(),
         'MID'=>$pool->getPositionWeightMid(),'ATT'=>$pool->getPositionWeightAtt()];
$bandOf = function(string $cc,int $t) use ($sc) { $b=$sc->getLeagueAbilityRanges()[$cc][(string)$t];
  return ['min'=>min((int)$b['min'],(int)$b['max']),'max'=>max((int)$b['min'],(int)$b['max'])]; };
$rowOf  = fn(int $t) => $sc->getNpcSquadConfig()[(string)$t];
$sizeOf = fn(int $t) => max(1, intdiv((int)$rowOf($t)['playerMin'] + (int)$rowOf($t)['playerMax'], 2));
$budgetOf = fn(int $turn) => intdiv(intdiv($turn*$gc->getEconomyWageToTurnoverRatioBp(),10000)*(10000-$gc->getEconomyStaffWageShareBp()),10000);
$wage = fn(int $micro, float $a) => intdiv((int) round($micro * ($a ** $k)), 1000000);
$money = fn(int $p) => number_format($p/100, 2);
// one real NPC squad, exactly as WorldPackClubGenerationService::generatePlayers() builds it
$squadOf = function(array $band, array $row) use ($gen,$posW,$ageRange) {
  $total=random_int((int)$row['playerMin'],(int)$row['playerMax']);
  $tw=array_sum($posW);$counts=[];$fr=[];$as=0;
  foreach($posW as $p=>$w){$e=$total*$w/$tw;$counts[$p]=(int)floor($e);$fr[$p]=$e-$counts[$p];$as+=$counts[$p];}
  $rem=$total-$as;arsort($fr);foreach(array_keys($fr) as $p){if($rem<=0)break;$counts[$p]++;$rem--;}
  $out=[];
  foreach($counts as $pv=>$cnt){$position=App\Enum\PlayerPosition::from($pv);
    for($i=0;$i<$cnt;$i++) $out[]=$gen->generate($position,App\Enum\RecruitmentSource::YOUTH_INTAKE,'English',$band,$ageRange);}
  return $out;
};
$sigmaOld = function(array $band,int $size) use ($k) {
  if ($size<=1) return ((int)round(($band['min']+$band['max'])/2))**$k;
  $s=0.0;$span=$band['max']-$band['min'];
  for($i=0;$i<$size;$i++) $s += ((int)round($band['min']+$span*$i/($size-1)))**$k;
  return $s; };
echo "A10 — WageModelResolver::averageFirstTeamWagePence() prices the MID OF THE POTENTIAL BAND.\n";
echo "Compared with the TRUE mean weekly wage over the reference squad, before and after.\n";
echo "refMean is invariant by construction: the reference squad's bill equals the budget.\n\n";
printf("%-6s %-7s %-5s | %16s %16s | %16s %16s | %10s\n",
  'cc','band','mid','bandMid BEFORE','bandMid AFTER','refMean BEFORE','refMean AFTER','after/truth');
foreach (['EN','SC'] as $cc) {
  for ($t=1;$t<=8;$t++) {
    $band=$bandOf($cc,$t); $size=$sizeOf($t); $span=$band['max']-$band['min'];
    $old=[]; for($i=0;$i<$size;$i++) $old[]=(int)round($band['min']+$span*$i/($size-1));
    $new=$resolver->referenceSquadAbilities($cc,$t);
    $sOld=$sigmaOld($band,$size);
    $scale=$resolver->resolve($cc,$t); $budget=$budgetOf($scale->turnoverPence);
    $mOld=(int)round(($budget*1000000)/($weeks*$sOld)); $mNew=$scale->wageScaleMicroPence;
    $mid=(int)round(($band['min']+$band['max'])/2);
    $rmOld=0;foreach($old as $a)$rmOld+=$wage($mOld,$a); $rmOld=intdiv($rmOld,count($old));
    $rmNew=0;foreach($new as $a)$rmNew+=$wage($mNew,$a); $rmNew=intdiv($rmNew,count($new));
    printf("%-6s %-7s %-5d | %16s %16s | %16s %16s | %9.2fx\n",
      "$cc T$t","{$band['min']}-{$band['max']}",$mid,
      $money($wage($mOld,$mid)),$money($wage($mNew,$mid)),$money($rmOld),$money($rmNew),
      $rmNew>0 ? $wage($mNew,$mid)/$rmNew : 0);
  }
}
printf("\nScholarship config: flat=%d capBp=%d tier1Anchor=%d floor=%d\n",
  $gc->getYouthScholarshipWagePence(), $gc->getEconomyYouthScholarshipCapBp(),
  $gc->getEconomyYouthScholarshipTier1Pence(), $gc->getEconomyYouthScholarshipFloorPence());
