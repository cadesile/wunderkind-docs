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
$CLUBS = (int)($argv[1] ?? 40);
echo "A10 — reference squad, sigma, S_tier and COVERAGE against real generated squads\n";
echo "Coverage = a real squad's SEASON bill / the tier's authored player budget.\n";
echo "{$CLUBS} clubs generated per tier through the real PlayerGenerationService.\n\n";
printf("%-6s %-7s %-5s %16s %16s %8s %12s %12s   %s\n",
  'cc','band','size','sigma_old(pot)','sigma_new(ECA)','old/new','S_old (p)','S_new (p)','coverage before -> after');
foreach (['EN','SC'] as $cc) {
  for ($t=1;$t<=8;$t++) {
    $band=$bandOf($cc,$t); $row=$rowOf($t); $size=$sizeOf($t);
    $sOld=$sigmaOld($band,$size);
    $newSquad=$resolver->referenceSquadAbilities($cc,$t);
    $sNew=0.0; foreach($newSquad as $a) $sNew += $a**$k;
    $scale=$resolver->resolve($cc,$t);
    $budget=$budgetOf($scale->turnoverPence);
    $mOld=(int)round(($budget*1000000)/($weeks*$sOld));
    $sumCaK=0.0;
    for($c=0;$c<$CLUBS;$c++) foreach($squadOf($band,$row) as $pl) $sumCaK += $pl->getCurrentAbility() ** $k;
    $real=$sumCaK/$CLUBS;
    printf("%-6s %-7s %-5d %16s %16s %8.3f %12.4f %12.4f   %6.1f%% -> %6.1f%%\n",
      "$cc T$t","{$band['min']}-{$band['max']}",$size,
      number_format($sOld,2),number_format($sNew,2),$sOld/$sNew,
      $mOld/1e6,$scale->wageScaleMicroPence/1e6,
      $real/$sOld*100,$real/$sNew*100);
  }
}
echo "\n\nTHE REFERENCE SQUAD MEMBERS — potential rung -> expected current ability\n";
foreach (['EN','SC'] as $cc) foreach ([1,8] as $t) {
  $band=$bandOf($cc,$t); $size=$sizeOf($t); $span=$band['max']-$band['min'];
  $ab=$resolver->referenceSquadAbilities($cc,$t);
  echo "\n$cc tier $t  band {$band['min']}-{$band['max']} (POTENTIAL)  size $size\n";
  foreach ($ab as $i=>$a) {
    $p = $size<=1 ? (int)round(($band['min']+$band['max'])/2) : (int)round($band['min']+$span*$i/($size-1));
    printf("  %3d -> %8.4f   (%.1f%% of potential)\n", $p, $a, $a/$p*100);
  }
}
