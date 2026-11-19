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
echo "A10 — WHAT THE REAL GENERATOR PRODUCES. Nothing here reads the economy; this is the\n";
echo "ground truth the deterministic expectation is checked against.\n\n";
printf("Config: firstTeamAgeRange=%s youthCeil(age<%d)=%d%% juniorCeil(age<%d)=%d%% posWeights=%s k=%.4f\n\n",
  json_encode($ageRange), $pool->getPlayerYouthAbilityCeilingAge(), $pool->getPlayerYouthAbilityCeilingPercent(),
  $pool->getPlayerJuniorAbilityCeilingAge(), $pool->getPlayerJuniorAbilityCeilingPercent(),
  json_encode($posW), $k);

$CLUBS = (int)($argv[1] ?? 40);
$byAge=[]; $byPos=[]; $byTier=[];
foreach (['EN','SC'] as $cc) for ($t=1;$t<=8;$t++) {
  $band=$bandOf($cc,$t); $row=$rowOf($t); $ca=0; $po=0; $n=0;
  for($c=0;$c<$CLUBS;$c++) foreach($squadOf($band,$row) as $pl) {
    $a=$pl->getCurrentAbility(); $p=$pl->getPotential(); $ca+=$a; $po+=$p; $n++;
    $age=(int)$pl->getDateOfBirth()->diff(new DateTimeImmutable('today'))->y;
    $byAge[$age]['ca']=($byAge[$age]['ca']??0)+$a; $byAge[$age]['po']=($byAge[$age]['po']??0)+$p; $byAge[$age]['n']=($byAge[$age]['n']??0)+1;
    $pv=$pl->getPosition()->value;
    $byPos[$pv]['ca']=($byPos[$pv]['ca']??0)+$a; $byPos[$pv]['po']=($byPos[$pv]['po']??0)+$p; $byPos[$pv]['n']=($byPos[$pv]['n']??0)+1;
  }
  $byTier["$cc T$t"]=['r'=>$ca/$po,'n'=>$n,'band'=>"{$band['min']}-{$band['max']}"];
}
echo "MEAN current ability / potential, PER TIER\n";
foreach ($byTier as $key=>$v) printf("  %-7s band %-7s n=%-5d  %.4f\n", $key, $v['band'], $v['n'], $v['r']);

echo "\nMEAN current ability / potential, BY AGE — against the deterministic expectation\n";
echo "  (expected uses potential 65 and the squad position weights, so it is comparable not identical)\n";
ksort($byAge);
printf("  %-4s %-7s %-10s %-12s %s\n",'age','n','measured','expTarget','model');
foreach ($byAge as $age=>$a) {
  $s=0.0;$w=0; foreach($posW as $pos=>$wt){ if($wt<=0)continue; $s+=$wt*$gen->expectedCurrentAbility(65,$age,App\Enum\PlayerPosition::from($pos)); $w+=$wt; }
  printf("  %-4d %-7d %-10.4f %-12.4f %.4f\n", $age, $a['n'], $a['ca']/$a['po'], $gen->expectedAbilityTargetForAge($age), ($s/$w)/65);
}
echo "\nMEAN current ability / potential, BY POSITION\n";
foreach ($byPos as $p=>$a) printf("  %-4s n=%-6d %.4f\n", $p, $a['n'], $a['ca']/$a['po']);

echo "\nPERSONALITY — expectedTraits() against rollTraits() over 40,000 rolls per age\n";
$pg = new App\Service\Personality\PersonalityGeneratorService();
foreach ([19,21,26] as $age) {
  $ctx = App\Service\Personality\PersonalityContext::forPlayer($age);
  $sum=[]; $N=40000;
  for($i=0;$i<$N;$i++) foreach($pg->rollTraits($ctx) as $tr=>$v) $sum[$tr]=($sum[$tr]??0)+$v;
  $exp = $pg->expectedTraits($ctx);
  echo "  age $age:\n";
  foreach ($sum as $tr=>$s) printf("    %-16s measured %7.3f   expectedTraits %7.3f   %+6.2f%%\n",
    $tr, $s/$N, $exp[$tr], ($exp[$tr]-$s/$N)/($s/$N)*100);
}
