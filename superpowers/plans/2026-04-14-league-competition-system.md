# League & Competition System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent 8-tier per-country league structure to the backend, wire NPC clubs and AMP academies into leagues, extend sync to include league snapshots and match results, and add season archiving via a conclude-season endpoint.

**Architecture:** New entities (`League`, `SeasonRecord`, `SeasonSnapshot`, `MatchResult`) are added with standard UuidV7 PKs following the NpcClub pattern. `LeagueService` owns all league business logic. `SyncService` is extended additively — new fields are optional so existing clients keep working. All commands run via `lando php` from the project root `/Users/courtneyadesile/Documents/WunderkindFactory/wunderkind-backend`.

**Tech Stack:** Symfony 8, Doctrine ORM, PostgreSQL 16, EasyAdmin 5, PHPUnit 11. Tests run with `lando php bin/phpunit`.

---

## File Map

**Create:**
- `src/Enum/ReputationTier.php`
- `src/Entity/League.php`
- `src/Repository/LeagueRepository.php`
- `src/Entity/SeasonRecord.php`
- `src/Repository/SeasonRecordRepository.php`
- `src/Entity/SeasonSnapshot.php`
- `src/Repository/SeasonSnapshotRepository.php`
- `src/Entity/MatchResult.php`
- `src/Repository/MatchResultRepository.php`
- `src/Service/LeagueService.php`
- `src/Dto/MatchResultDto.php`
- `src/Dto/ConcludeSeasonRequest.php`
- `src/Controller/Api/LeagueController.php`
- `src/Controller/Admin/LeagueCrudController.php`
- `tests/Enum/ReputationTierTest.php`
- `tests/Entity/LeagueTest.php`
- `tests/Entity/SeasonRecordTest.php`
- `tests/Entity/SeasonSnapshotTest.php`
- `tests/Entity/MatchResultTest.php`
- `tests/Service/LeagueServiceTest.php`
- `tests/Controller/Api/LeagueControllerTest.php`

**Modify:**
- `src/Entity/StarterConfig.php` — add `defaultFacilities` (JSON) + `starterReputationTier` (ReputationTier enum)
- `src/Entity/Academy.php` — add `currentLeague` (ManyToOne → League, nullable) + `currentSeason` (smallint default 1)
- `src/Entity/NpcClub.php` — add `league` (ManyToOne → League, nullable)
- `src/Repository/NpcClubRepository.php` — add `findByLeague(League $league): array`
- `src/Repository/SeasonSnapshotRepository.php` — add `findByAcademy` + `findByAcademyAndSeason`
- `src/Dto/SyncRequest.php` — add `matchResults` array + `setMatchResults()`
- `src/Service/SyncService.php` — add match result persistence + league snapshot in response
- `src/Service/NpcClubGenerationService.php` — auto-assign clubs to league after generation
- `src/Controller/Admin/DashboardController.php` — add `LeagueService`, `LeagueRepository`; new `generateLeagues` route; update `saveStarterConfig`; add League sidebar item
- `templates/admin/npc_clubs_content.html.twig` — add Generate League Structure card
- `templates/admin/starter_config.html.twig` — add defaultFacilities + starterReputationTier fields

---

### Task 1: ReputationTier enum

**Files:**
- Create: `src/Enum/ReputationTier.php`
- Test: `tests/Enum/ReputationTierTest.php`

- [ ] **Step 1: Write the failing test**

```php
// tests/Enum/ReputationTierTest.php
<?php

namespace App\Tests\Enum;

use App\Enum\ReputationTier;
use PHPUnit\Framework\TestCase;

class ReputationTierTest extends TestCase
{
    public function testCasesExist(): void
    {
        $this->assertSame('local',    ReputationTier::LOCAL->value);
        $this->assertSame('regional', ReputationTier::REGIONAL->value);
        $this->assertSame('national', ReputationTier::NATIONAL->value);
        $this->assertSame('elite',    ReputationTier::ELITE->value);
    }

    public function testTryFrom(): void
    {
        $this->assertSame(ReputationTier::LOCAL, ReputationTier::tryFrom('local'));
        $this->assertNull(ReputationTier::tryFrom('unknown'));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
lando php bin/phpunit tests/Enum/ReputationTierTest.php --testdox
```
Expected: FAIL — class not found.

- [ ] **Step 3: Create the enum**

```php
// src/Enum/ReputationTier.php
<?php

namespace App\Enum;

enum ReputationTier: string
{
    case LOCAL    = 'local';
    case REGIONAL = 'regional';
    case NATIONAL = 'national';
    case ELITE    = 'elite';
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
lando php bin/phpunit tests/Enum/ReputationTierTest.php --testdox
```
Expected: 2 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/Enum/ReputationTier.php tests/Enum/ReputationTierTest.php
git commit -m "feat: add ReputationTier enum (LOCAL/REGIONAL/NATIONAL/ELITE)"
```

---

### Task 2: League entity + repository

**Files:**
- Create: `src/Entity/League.php`
- Create: `src/Repository/LeagueRepository.php`
- Test: `tests/Entity/LeagueTest.php`

- [ ] **Step 1: Write the failing test**

```php
// tests/Entity/LeagueTest.php
<?php

namespace App\Tests\Entity;

use App\Entity\League;
use PHPUnit\Framework\TestCase;

class LeagueTest extends TestCase
{
    public function testConstructorAndGetters(): void
    {
        $league = new League('EN', 3, 'League 3');

        $this->assertSame('EN', $league->getCountry());
        $this->assertSame(3, $league->getTier());
        $this->assertSame('League 3', $league->getName());
        $this->assertNotNull($league->getId());
        $this->assertNotNull($league->getCreatedAt());
    }

    public function testSetters(): void
    {
        $league = new League('EN', 1, 'Premier League');
        $league->setName('Top Flight');
        $league->setCountry('ES');
        $league->setTier(2);

        $this->assertSame('Top Flight', $league->getName());
        $this->assertSame('ES', $league->getCountry());
        $this->assertSame(2, $league->getTier());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
lando php bin/phpunit tests/Entity/LeagueTest.php --testdox
```
Expected: FAIL — class not found.

- [ ] **Step 3: Create the entity**

```php
// src/Entity/League.php
<?php

namespace App\Entity;

use App\Repository\LeagueRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\UuidV7;

#[ORM\Entity(repositoryClass: LeagueRepository::class)]
#[ORM\Table(name: 'league')]
#[ORM\UniqueConstraint(name: 'uq_league_country_tier', columns: ['country', 'tier'])]
class League
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private UuidV7 $id;

    #[ORM\Column(length: 2)]
    private string $country;

    #[ORM\Column(type: 'smallint')]
    private int $tier;

    #[ORM\Column(length: 100)]
    private string $name;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $country, int $tier, string $name)
    {
        $this->id        = new UuidV7();
        $this->country   = $country;
        $this->tier      = $tier;
        $this->name      = $name;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): UuidV7 { return $this->id; }

    public function getCountry(): string { return $this->country; }
    public function setCountry(string $v): static { $this->country = $v; return $this; }

    public function getTier(): int { return $this->tier; }
    public function setTier(int $v): static { $this->tier = $v; return $this; }

    public function getName(): string { return $this->name; }
    public function setName(string $v): static { $this->name = $v; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
```

- [ ] **Step 4: Create the repository**

```php
// src/Repository/LeagueRepository.php
<?php

namespace App\Repository;

use App\Entity\League;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<League>
 */
class LeagueRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, League::class);
    }

    public function findByCountryAndTier(string $country, int $tier): ?League
    {
        return $this->findOneBy(['country' => $country, 'tier' => $tier]);
    }

    /** @return League[] sorted tier ASC */
    public function findByCountry(string $country): array
    {
        return $this->findBy(['country' => $country], ['tier' => 'ASC']);
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
lando php bin/phpunit tests/Entity/LeagueTest.php --testdox
```
Expected: 2 tests, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/Entity/League.php src/Repository/LeagueRepository.php tests/Entity/LeagueTest.php
git commit -m "feat: add League entity and repository"
```

---

### Task 3: SeasonRecord entity + repository

**Files:**
- Create: `src/Entity/SeasonRecord.php`
- Create: `src/Repository/SeasonRecordRepository.php`
- Test: `tests/Entity/SeasonRecordTest.php`

- [ ] **Step 1: Write the failing test**

```php
// tests/Entity/SeasonRecordTest.php
<?php

namespace App\Tests\Entity;

use App\Entity\Academy;
use App\Entity\League;
use App\Entity\SeasonRecord;
use App\Entity\User;
use PHPUnit\Framework\TestCase;

class SeasonRecordTest extends TestCase
{
    public function testConstructorAndGetters(): void
    {
        $user    = $this->createMock(User::class);
        $academy = new Academy('Test FC', $user);
        $league  = new League('EN', 8, 'League 8');

        $record = new SeasonRecord(
            academy:       $academy,
            league:        $league,
            season:        1,
            finalPosition: 2,
            gamesPlayed:   30,
            wins:          18,
            draws:         6,
            losses:        6,
            goalsFor:      55,
            goalsAgainst:  30,
            points:        60,
            promoted:      false,
            relegated:     false,
        );

        $this->assertSame($academy, $record->getAcademy());
        $this->assertSame($league,  $record->getLeague());
        $this->assertSame(1,        $record->getSeason());
        $this->assertSame(2,        $record->getFinalPosition());
        $this->assertSame(30,       $record->getGamesPlayed());
        $this->assertSame(18,       $record->getWins());
        $this->assertSame(6,        $record->getDraws());
        $this->assertSame(6,        $record->getLosses());
        $this->assertSame(55,       $record->getGoalsFor());
        $this->assertSame(30,       $record->getGoalsAgainst());
        $this->assertSame(60,       $record->getPoints());
        $this->assertFalse($record->isPromoted());
        $this->assertFalse($record->isRelegated());
        $this->assertNotNull($record->getId());
        $this->assertNotNull($record->getCreatedAt());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
lando php bin/phpunit tests/Entity/SeasonRecordTest.php --testdox
```
Expected: FAIL — class not found.

- [ ] **Step 3: Create the entity**

```php
// src/Entity/SeasonRecord.php
<?php

namespace App\Entity;

use App\Repository\SeasonRecordRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\UuidV7;

#[ORM\Entity(repositoryClass: SeasonRecordRepository::class)]
#[ORM\Table(name: 'season_record')]
class SeasonRecord
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private UuidV7 $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private Academy $academy;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private League $league;

    #[ORM\Column(type: 'smallint')]
    private int $season;

    #[ORM\Column(type: 'smallint')]
    private int $finalPosition;

    #[ORM\Column(type: 'smallint')]
    private int $gamesPlayed;

    #[ORM\Column(type: 'smallint')]
    private int $wins;

    #[ORM\Column(type: 'smallint')]
    private int $draws;

    #[ORM\Column(type: 'smallint')]
    private int $losses;

    #[ORM\Column(type: 'smallint')]
    private int $goalsFor;

    #[ORM\Column(type: 'smallint')]
    private int $goalsAgainst;

    #[ORM\Column(type: 'smallint')]
    private int $points;

    #[ORM\Column]
    private bool $promoted;

    #[ORM\Column]
    private bool $relegated;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        Academy $academy,
        League $league,
        int $season,
        int $finalPosition,
        int $gamesPlayed,
        int $wins,
        int $draws,
        int $losses,
        int $goalsFor,
        int $goalsAgainst,
        int $points,
        bool $promoted,
        bool $relegated,
    ) {
        $this->id            = new UuidV7();
        $this->academy       = $academy;
        $this->league        = $league;
        $this->season        = $season;
        $this->finalPosition = $finalPosition;
        $this->gamesPlayed   = $gamesPlayed;
        $this->wins          = $wins;
        $this->draws         = $draws;
        $this->losses        = $losses;
        $this->goalsFor      = $goalsFor;
        $this->goalsAgainst  = $goalsAgainst;
        $this->points        = $points;
        $this->promoted      = $promoted;
        $this->relegated     = $relegated;
        $this->createdAt     = new \DateTimeImmutable();
    }

    public function getId(): UuidV7 { return $this->id; }
    public function getAcademy(): Academy { return $this->academy; }
    public function getLeague(): League { return $this->league; }
    public function getSeason(): int { return $this->season; }
    public function getFinalPosition(): int { return $this->finalPosition; }
    public function getGamesPlayed(): int { return $this->gamesPlayed; }
    public function getWins(): int { return $this->wins; }
    public function getDraws(): int { return $this->draws; }
    public function getLosses(): int { return $this->losses; }
    public function getGoalsFor(): int { return $this->goalsFor; }
    public function getGoalsAgainst(): int { return $this->goalsAgainst; }
    public function getPoints(): int { return $this->points; }
    public function isPromoted(): bool { return $this->promoted; }
    public function isRelegated(): bool { return $this->relegated; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
```

- [ ] **Step 4: Create the repository**

```php
// src/Repository/SeasonRecordRepository.php
<?php

namespace App\Repository;

use App\Entity\SeasonRecord;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<SeasonRecord>
 */
class SeasonRecordRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SeasonRecord::class);
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
lando php bin/phpunit tests/Entity/SeasonRecordTest.php --testdox
```
Expected: 1 test, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/Entity/SeasonRecord.php src/Repository/SeasonRecordRepository.php tests/Entity/SeasonRecordTest.php
git commit -m "feat: add SeasonRecord entity and repository"
```

---

### Task 4: SeasonSnapshot entity + repository

**Files:**
- Create: `src/Entity/SeasonSnapshot.php`
- Create: `src/Repository/SeasonSnapshotRepository.php`
- Test: `tests/Entity/SeasonSnapshotTest.php`

- [ ] **Step 1: Write the failing test**

```php
// tests/Entity/SeasonSnapshotTest.php
<?php

namespace App\Tests\Entity;

use App\Entity\Academy;
use App\Entity\SeasonSnapshot;
use App\Entity\User;
use PHPUnit\Framework\TestCase;

class SeasonSnapshotTest extends TestCase
{
    public function testConstructorAndGetters(): void
    {
        $user    = $this->createMock(User::class);
        $academy = new Academy('Test FC', $user);
        $data    = ['amp' => ['leagueTier' => 8, 'finalPosition' => 1], 'pyramid' => []];

        $snapshot = new SeasonSnapshot(
            academy:      $academy,
            season:       1,
            country:      'EN',
            snapshotData: $data,
        );

        $this->assertSame($academy, $snapshot->getAcademy());
        $this->assertSame(1,        $snapshot->getSeason());
        $this->assertSame('EN',     $snapshot->getCountry());
        $this->assertSame($data,    $snapshot->getSnapshotData());
        $this->assertNotNull($snapshot->getId());
        $this->assertNotNull($snapshot->getCreatedAt());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
lando php bin/phpunit tests/Entity/SeasonSnapshotTest.php --testdox
```
Expected: FAIL — class not found.

- [ ] **Step 3: Create the entity**

```php
// src/Entity/SeasonSnapshot.php
<?php

namespace App\Entity;

use App\Repository\SeasonSnapshotRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\UuidV7;

#[ORM\Entity(repositoryClass: SeasonSnapshotRepository::class)]
#[ORM\Table(name: 'season_snapshot')]
class SeasonSnapshot
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private UuidV7 $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private Academy $academy;

    #[ORM\Column(type: 'smallint')]
    private int $season;

    #[ORM\Column(length: 2)]
    private string $country;

    #[ORM\Column(type: 'json')]
    private array $snapshotData;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        Academy $academy,
        int $season,
        string $country,
        array $snapshotData,
    ) {
        $this->id           = new UuidV7();
        $this->academy      = $academy;
        $this->season       = $season;
        $this->country      = $country;
        $this->snapshotData = $snapshotData;
        $this->createdAt    = new \DateTimeImmutable();
    }

    public function getId(): UuidV7 { return $this->id; }
    public function getAcademy(): Academy { return $this->academy; }
    public function getSeason(): int { return $this->season; }
    public function getCountry(): string { return $this->country; }
    public function getSnapshotData(): array { return $this->snapshotData; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
```

- [ ] **Step 4: Create the repository**

```php
// src/Repository/SeasonSnapshotRepository.php
<?php

namespace App\Repository;

use App\Entity\Academy;
use App\Entity\SeasonSnapshot;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<SeasonSnapshot>
 */
class SeasonSnapshotRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SeasonSnapshot::class);
    }

    /** @return SeasonSnapshot[] ordered by season ASC */
    public function findByAcademy(Academy $academy): array
    {
        return $this->findBy(['academy' => $academy], ['season' => 'ASC']);
    }

    public function findByAcademyAndSeason(Academy $academy, int $season): ?SeasonSnapshot
    {
        return $this->findOneBy(['academy' => $academy, 'season' => $season]);
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
lando php bin/phpunit tests/Entity/SeasonSnapshotTest.php --testdox
```
Expected: 1 test, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/Entity/SeasonSnapshot.php src/Repository/SeasonSnapshotRepository.php tests/Entity/SeasonSnapshotTest.php
git commit -m "feat: add SeasonSnapshot entity and repository"
```

---

### Task 5: MatchResult entity + repository

**Files:**
- Create: `src/Entity/MatchResult.php`
- Create: `src/Repository/MatchResultRepository.php`
- Test: `tests/Entity/MatchResultTest.php`

- [ ] **Step 1: Write the failing test**

```php
// tests/Entity/MatchResultTest.php
<?php

namespace App\Tests\Entity;

use App\Entity\Academy;
use App\Entity\MatchResult;
use App\Entity\NpcClub;
use App\Entity\User;
use PHPUnit\Framework\TestCase;

class MatchResultTest extends TestCase
{
    public function testConstructorAndGetters(): void
    {
        $user    = $this->createMock(User::class);
        $academy = new Academy('Test FC', $user);
        $club    = new NpcClub('Norwich Town', 'EN', 8, 12, '#ffffff', '#000000', 100000, []);

        $result = new MatchResult(
            academy:      $academy,
            opponentClub: $club,
            goalsFor:     2,
            goalsAgainst: 1,
            week:         14,
            season:       1,
        );

        $this->assertSame($academy, $result->getAcademy());
        $this->assertSame($club,    $result->getOpponentClub());
        $this->assertSame(2,        $result->getGoalsFor());
        $this->assertSame(1,        $result->getGoalsAgainst());
        $this->assertSame(14,       $result->getWeek());
        $this->assertSame(1,        $result->getSeason());
        $this->assertNotNull($result->getId());
        $this->assertNotNull($result->getCreatedAt());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
lando php bin/phpunit tests/Entity/MatchResultTest.php --testdox
```
Expected: FAIL — class not found.

- [ ] **Step 3: Create the entity**

```php
// src/Entity/MatchResult.php
<?php

namespace App\Entity;

use App\Repository\MatchResultRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\UuidV7;

#[ORM\Entity(repositoryClass: MatchResultRepository::class)]
#[ORM\Table(name: 'match_result')]
class MatchResult
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private UuidV7 $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private Academy $academy;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private NpcClub $opponentClub;

    #[ORM\Column(type: 'smallint')]
    private int $goalsFor;

    #[ORM\Column(type: 'smallint')]
    private int $goalsAgainst;

    #[ORM\Column(type: 'smallint')]
    private int $week;

    #[ORM\Column(type: 'smallint')]
    private int $season;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        Academy $academy,
        NpcClub $opponentClub,
        int $goalsFor,
        int $goalsAgainst,
        int $week,
        int $season,
    ) {
        $this->id           = new UuidV7();
        $this->academy      = $academy;
        $this->opponentClub = $opponentClub;
        $this->goalsFor     = $goalsFor;
        $this->goalsAgainst = $goalsAgainst;
        $this->week         = $week;
        $this->season       = $season;
        $this->createdAt    = new \DateTimeImmutable();
    }

    public function getId(): UuidV7 { return $this->id; }
    public function getAcademy(): Academy { return $this->academy; }
    public function getOpponentClub(): NpcClub { return $this->opponentClub; }
    public function getGoalsFor(): int { return $this->goalsFor; }
    public function getGoalsAgainst(): int { return $this->goalsAgainst; }
    public function getWeek(): int { return $this->week; }
    public function getSeason(): int { return $this->season; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
```

- [ ] **Step 4: Create the repository**

```php
// src/Repository/MatchResultRepository.php
<?php

namespace App\Repository;

use App\Entity\MatchResult;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<MatchResult>
 */
class MatchResultRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, MatchResult::class);
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
lando php bin/phpunit tests/Entity/MatchResultTest.php --testdox
```
Expected: 1 test, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/Entity/MatchResult.php src/Repository/MatchResultRepository.php tests/Entity/MatchResultTest.php
git commit -m "feat: add MatchResult entity and repository"
```

---

### Task 6: StarterConfig additions

**Files:**
- Modify: `src/Entity/StarterConfig.php`
- Test: `tests/Entity/StarterConfigLeagueFieldsTest.php`

- [ ] **Step 1: Write the failing test**

```php
// tests/Entity/StarterConfigLeagueFieldsTest.php
<?php

namespace App\Tests\Entity;

use App\Entity\StarterConfig;
use App\Enum\ReputationTier;
use PHPUnit\Framework\TestCase;

class StarterConfigLeagueFieldsTest extends TestCase
{
    public function testDefaultValues(): void
    {
        $config = StarterConfig::defaults();

        $this->assertSame([],                    $config->getDefaultFacilities());
        $this->assertSame('{}',                  $config->getDefaultFacilitiesJson());
        $this->assertSame(ReputationTier::LOCAL,  $config->getStarterReputationTier());
    }

    public function testFacilitiesJsonRoundTrip(): void
    {
        $config = StarterConfig::defaults();
        $config->setDefaultFacilitiesJson('{"training_pitch": 2, "north_stand": 1}');

        $this->assertSame(['training_pitch' => 2, 'north_stand' => 1], $config->getDefaultFacilities());
        $this->assertStringContainsString('training_pitch', $config->getDefaultFacilitiesJson());
    }

    public function testReputationTierSetter(): void
    {
        $config = StarterConfig::defaults();
        $config->setStarterReputationTier(ReputationTier::NATIONAL);

        $this->assertSame(ReputationTier::NATIONAL, $config->getStarterReputationTier());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
lando php bin/phpunit tests/Entity/StarterConfigLeagueFieldsTest.php --testdox
```
Expected: FAIL — methods not found.

- [ ] **Step 3: Add fields to StarterConfig**

Open `src/Entity/StarterConfig.php`. Add these imports at the top:

```php
use App\Enum\ReputationTier;
```

Add these properties after `$starterAcademyTier`:

```php
    /**
     * Default facility levels for a new club. Flat slug → level map.
     * Same JSON format as NpcClub.facilities. Default: empty (no facilities).
     */
    #[ORM\Column(type: 'json')]
    private array $defaultFacilities = [];

    /**
     * Starting club reputation band. Default: LOCAL (bottom tier).
     */
    #[ORM\Column(type: 'string', length: 20, enumType: ReputationTier::class)]
    private ReputationTier $starterReputationTier = ReputationTier::LOCAL;
```

Add these getters/setters after `setStarterAcademyTier()`:

```php
    public function getDefaultFacilities(): array { return $this->defaultFacilities; }
    public function setDefaultFacilities(array $v): static { $this->defaultFacilities = $v; return $this; }

    public function getDefaultFacilitiesJson(): string
    {
        return json_encode($this->defaultFacilities, JSON_PRETTY_PRINT) ?: '{}';
    }

    public function setDefaultFacilitiesJson(string $v): static
    {
        $this->defaultFacilities = json_decode($v, true) ?? [];
        return $this;
    }

    public function getStarterReputationTier(): ReputationTier { return $this->starterReputationTier; }
    public function setStarterReputationTier(ReputationTier $v): static { $this->starterReputationTier = $v; return $this; }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
lando php bin/phpunit tests/Entity/StarterConfigLeagueFieldsTest.php --testdox
```
Expected: 3 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/Entity/StarterConfig.php tests/Entity/StarterConfigLeagueFieldsTest.php
git commit -m "feat: add defaultFacilities and starterReputationTier to StarterConfig"
```

---

### Task 7: Academy additions (currentLeague + currentSeason)

**Files:**
- Modify: `src/Entity/Academy.php`
- Test: `tests/Entity/AcademyLeagueFieldsTest.php`

- [ ] **Step 1: Write the failing test**

```php
// tests/Entity/AcademyLeagueFieldsTest.php
<?php

namespace App\Tests\Entity;

use App\Entity\Academy;
use App\Entity\League;
use App\Entity\User;
use PHPUnit\Framework\TestCase;

class AcademyLeagueFieldsTest extends TestCase
{
    public function testDefaultValues(): void
    {
        $user    = $this->createMock(User::class);
        $academy = new Academy('Test FC', $user);

        $this->assertNull($academy->getCurrentLeague());
        $this->assertSame(1, $academy->getCurrentSeason());
    }

    public function testSetCurrentLeague(): void
    {
        $user    = $this->createMock(User::class);
        $academy = new Academy('Test FC', $user);
        $league  = new League('EN', 8, 'League 8');

        $academy->setCurrentLeague($league);
        $this->assertSame($league, $academy->getCurrentLeague());

        $academy->setCurrentLeague(null);
        $this->assertNull($academy->getCurrentLeague());
    }

    public function testSetCurrentSeason(): void
    {
        $user    = $this->createMock(User::class);
        $academy = new Academy('Test FC', $user);

        $academy->setCurrentSeason(3);
        $this->assertSame(3, $academy->getCurrentSeason());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
lando php bin/phpunit tests/Entity/AcademyLeagueFieldsTest.php --testdox
```
Expected: FAIL — methods not found.

- [ ] **Step 3: Add fields to Academy**

Open `src/Entity/Academy.php`. Add this import after existing use statements:

```php
use App\Entity\League;
```

Add these properties after the `$country` property (around line 51):

```php
    /** League the AMP club currently competes in. Null until first league assignment. */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true)]
    private ?League $currentLeague = null;

    /** Season number, starts at 1 and increments each time conclude-season is called. */
    #[ORM\Column(type: 'smallint', options: ['default' => 1])]
    private int $currentSeason = 1;
```

Add these getters/setters after `setCountry()` (or after any nearby setter):

```php
    public function getCurrentLeague(): ?League { return $this->currentLeague; }
    public function setCurrentLeague(?League $v): static { $this->currentLeague = $v; return $this; }

    public function getCurrentSeason(): int { return $this->currentSeason; }
    public function setCurrentSeason(int $v): static { $this->currentSeason = $v; return $this; }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
lando php bin/phpunit tests/Entity/AcademyLeagueFieldsTest.php --testdox
```
Expected: 3 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/Entity/Academy.php tests/Entity/AcademyLeagueFieldsTest.php
git commit -m "feat: add currentLeague and currentSeason to Academy entity"
```

---

### Task 8: NpcClub.league FK + findByLeague repository method

**Files:**
- Modify: `src/Entity/NpcClub.php`
- Modify: `src/Repository/NpcClubRepository.php`
- Test: `tests/Entity/NpcClubLeagueFieldTest.php`

- [ ] **Step 1: Write the failing test**

```php
// tests/Entity/NpcClubLeagueFieldTest.php
<?php

namespace App\Tests\Entity;

use App\Entity\League;
use App\Entity\NpcClub;
use PHPUnit\Framework\TestCase;

class NpcClubLeagueFieldTest extends TestCase
{
    public function testLeagueDefaultsToNull(): void
    {
        $club = new NpcClub('Test FC', 'EN', 8, 10, '#fff', '#000', 50000, []);
        $this->assertNull($club->getLeague());
    }

    public function testSetLeague(): void
    {
        $club   = new NpcClub('Test FC', 'EN', 8, 10, '#fff', '#000', 50000, []);
        $league = new League('EN', 8, 'League 8');

        $club->setLeague($league);
        $this->assertSame($league, $club->getLeague());

        $club->setLeague(null);
        $this->assertNull($club->getLeague());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
lando php bin/phpunit tests/Entity/NpcClubLeagueFieldTest.php --testdox
```
Expected: FAIL — method not found.

- [ ] **Step 3: Add league FK to NpcClub**

Open `src/Entity/NpcClub.php`. Add this import:

```php
use App\Entity\League;
```

Add this property after `$facilities`:

```php
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true)]
    private ?League $league = null;
```

Add this getter/setter after `setFacilitiesJson()`:

```php
    public function getLeague(): ?League { return $this->league; }
    public function setLeague(?League $v): static { $this->league = $v; return $this; }
```

- [ ] **Step 4: Add findByLeague to NpcClubRepository**

Open `src/Repository/NpcClubRepository.php`. Add this import:

```php
use App\Entity\League;
```

Add this method after `deleteByCountryAndTier()`:

```php
    /** @return NpcClub[] */
    public function findByLeague(League $league): array
    {
        return $this->findBy(['league' => $league]);
    }
```

- [ ] **Step 5: Run test to verify it passes**

```bash
lando php bin/phpunit tests/Entity/NpcClubLeagueFieldTest.php --testdox
```
Expected: 2 tests, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/Entity/NpcClub.php src/Repository/NpcClubRepository.php tests/Entity/NpcClubLeagueFieldTest.php
git commit -m "feat: add league FK to NpcClub and findByLeague to repository"
```

---

### Task 9: Database migration

**Files:**
- Create: `migrations/VersionYYYYMMDDHHmmss.php` (auto-generated, exact name varies)

- [ ] **Step 1: Verify schema drift before migrating**

```bash
lando php bin/console doctrine:schema:validate
```
Expected output includes: `[ERROR] The database schema is not in sync with the mapping files.` This confirms the new entities/fields need migrating.

- [ ] **Step 2: Generate the migration**

```bash
lando php bin/console doctrine:migrations:diff
```
Expected: `Generated new migration class to ...migrations/VersionXXX.php`

- [ ] **Step 3: Open the generated migration and verify it contains these statements**

Check that the migration file (in `migrations/`) includes:
- `CREATE TABLE league (...)`
- `CREATE TABLE season_record (...)`
- `CREATE TABLE season_snapshot (...)`
- `CREATE TABLE match_result (...)`
- `ALTER TABLE npc_club ADD league_id ...`
- `ALTER TABLE academy ADD current_league_id ...`
- `ALTER TABLE academy ADD current_season SMALLINT ...`
- `ALTER TABLE starter_config ADD default_facilities JSON ...`
- `ALTER TABLE starter_config ADD starter_reputation_tier VARCHAR(20) ...`

- [ ] **Step 4: Add DEFAULT values for NOT NULL columns on existing rows**

The `academy.current_season` column is NOT NULL and existing rows need a default. Find the `ALTER TABLE academy ADD current_season` line in the migration and change it to include `DEFAULT 1`:

```php
// Find this line (exact SQL may vary slightly):
$this->addSql("ALTER TABLE academy ADD current_season SMALLINT NOT NULL");
// Change to:
$this->addSql("ALTER TABLE academy ADD current_season SMALLINT NOT NULL DEFAULT 1");
```

Similarly for `starter_config.default_facilities` (existing row needs `DEFAULT '{}'`):
```php
// Find:
$this->addSql("ALTER TABLE starter_config ADD default_facilities JSON NOT NULL");
// Change to:
$this->addSql("ALTER TABLE starter_config ADD default_facilities JSON NOT NULL DEFAULT '{}'");
```

And `starter_config.starter_reputation_tier`:
```php
// Find:
$this->addSql("ALTER TABLE starter_config ADD starter_reputation_tier VARCHAR(20) NOT NULL");
// Change to:
$this->addSql("ALTER TABLE starter_config ADD starter_reputation_tier VARCHAR(20) NOT NULL DEFAULT 'local'");
```

- [ ] **Step 5: Run the migration**

```bash
lando php bin/console doctrine:migrations:migrate --no-interaction
```
Expected: `[notice] Migrating up to ...`

- [ ] **Step 6: Validate schema is now in sync**

```bash
lando php bin/console doctrine:schema:validate
```
Expected: `[OK] The database schema is in sync with the mapping files.`

- [ ] **Step 7: Check if Doctrine generates a cleanup migration (DC2Type drift)**

```bash
lando php bin/console doctrine:migrations:diff
```
If it generates a second migration, inspect it. If it only drops DEFAULT constraints (same as Spec A cleanup pattern), run it:
```bash
lando php bin/console doctrine:migrations:migrate --no-interaction
```

- [ ] **Step 8: Commit**

```bash
git add migrations/
git commit -m "feat: migration — add league, season_record, season_snapshot, match_result tables and FK columns"
```

---

### Task 10: LeagueService

**Files:**
- Create: `src/Service/LeagueService.php`
- Test: `tests/Service/LeagueServiceTest.php`

- [ ] **Step 1: Write the failing test**

```php
// tests/Service/LeagueServiceTest.php
<?php

namespace App\Tests\Service;

use App\Entity\Academy;
use App\Entity\League;
use App\Entity\NpcClub;
use App\Entity\User;
use App\Repository\LeagueRepository;
use App\Service\LeagueService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class LeagueServiceTest extends TestCase
{
    private function makeService(LeagueRepository $repo): LeagueService
    {
        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist')->willReturn(null);
        $em->method('flush')->willReturn(null);
        return new LeagueService($repo, $em);
    }

    public function testGenerateLeaguesSkipsExisting(): void
    {
        $repo = $this->createMock(LeagueRepository::class);
        // tier 1 already exists, tiers 2–8 do not
        $repo->method('findByCountryAndTier')
             ->willReturnCallback(fn($c, $t) => $t === 1 ? new League('EN', 1, 'League 1') : null);

        $service = $this->makeService($repo);
        $created = $service->generateLeaguesForCountry('EN');

        $this->assertCount(7, $created); // 8 tiers - 1 existing = 7
        $this->assertSame(2, $created[0]->getTier());
    }

    public function testAssignClubToLeagueSetsLeague(): void
    {
        $league = new League('EN', 8, 'League 8');
        $repo   = $this->createMock(LeagueRepository::class);
        $repo->method('findByCountryAndTier')->willReturn($league);

        $club    = new NpcClub('Test FC', 'EN', 8, 10, '#fff', '#000', 50000, []);
        $service = $this->makeService($repo);
        $service->assignClubToLeague($club);

        $this->assertSame($league, $club->getLeague());
    }

    public function testAssignClubToLeagueDoesNothingIfNoLeague(): void
    {
        $repo = $this->createMock(LeagueRepository::class);
        $repo->method('findByCountryAndTier')->willReturn(null);

        $club    = new NpcClub('Test FC', 'EN', 8, 10, '#fff', '#000', 50000, []);
        $service = $this->makeService($repo);
        $service->assignClubToLeague($club);

        $this->assertNull($club->getLeague());
    }

    public function testAssignAcademyToStarterLeague(): void
    {
        $league = new League('EN', 8, 'League 8');
        $repo   = $this->createMock(LeagueRepository::class);
        $repo->method('findByCountryAndTier')->with('EN', 8)->willReturn($league);

        $user    = $this->createMock(User::class);
        $academy = new Academy('Test FC', $user);
        $service = $this->makeService($repo);
        $service->assignAcademyToStarterLeague($academy, 'EN');

        $this->assertSame($league, $academy->getCurrentLeague());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
lando php bin/phpunit tests/Service/LeagueServiceTest.php --testdox
```
Expected: FAIL — class not found.

- [ ] **Step 3: Create the service**

```php
// src/Service/LeagueService.php
<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\ConcludeSeasonRequest;
use App\Entity\Academy;
use App\Entity\League;
use App\Entity\NpcClub;
use App\Entity\SeasonRecord;
use App\Entity\SeasonSnapshot;
use App\Repository\LeagueRepository;
use Doctrine\ORM\EntityManagerInterface;

class LeagueService
{
    public function __construct(
        private readonly LeagueRepository       $leagueRepository,
        private readonly EntityManagerInterface $em,
    ) {}

    /** @return League[] newly created leagues (skips tiers that already exist) */
    public function generateLeaguesForCountry(string $country): array
    {
        $created = [];
        for ($tier = 1; $tier <= 8; $tier++) {
            if ($this->leagueRepository->findByCountryAndTier($country, $tier) !== null) {
                continue;
            }
            $league    = new League($country, $tier, sprintf('League %d', $tier));
            $this->em->persist($league);
            $created[] = $league;
        }
        $this->em->flush();
        return $created;
    }

    /** Assigns the NpcClub to its matching League if one exists (country + tier). */
    public function assignClubToLeague(NpcClub $club): void
    {
        $league = $this->leagueRepository->findByCountryAndTier($club->getCountry(), $club->getTier());
        if ($league !== null) {
            $club->setLeague($league);
        }
    }

    /**
     * Assigns a new Academy to the tier-8 league for its country.
     * Call this from AcademyInitService after academy creation.
     */
    public function assignAcademyToStarterLeague(Academy $academy, string $country): void
    {
        $league = $this->leagueRepository->findByCountryAndTier($country, 8);
        if ($league !== null) {
            $academy->setCurrentLeague($league);
        }
    }

    /**
     * Concludes the current season for an academy:
     * - Persists SeasonRecord + SeasonSnapshot
     * - Moves academy to new league if promoted/relegated
     * - Increments academy.currentSeason
     *
     * @return array{seasonRecordId: string, newLeague: array{id: string, tier: int, name: string}|null}
     */
    public function concludeSeason(Academy $academy, ConcludeSeasonRequest $dto): array
    {
        $currentLeague = $academy->getCurrentLeague();
        if ($currentLeague === null) {
            throw new \RuntimeException('Academy has no current league assigned.');
        }

        $record = new SeasonRecord(
            academy:       $academy,
            league:        $currentLeague,
            season:        $academy->getCurrentSeason(),
            finalPosition: $dto->finalPosition,
            gamesPlayed:   $dto->gamesPlayed,
            wins:          $dto->wins,
            draws:         $dto->draws,
            losses:        $dto->losses,
            goalsFor:      $dto->goalsFor,
            goalsAgainst:  $dto->goalsAgainst,
            points:        $dto->points,
            promoted:      $dto->promoted,
            relegated:     $dto->relegated,
        );
        $this->em->persist($record);

        $snapshot = new SeasonSnapshot(
            academy:      $academy,
            season:       $academy->getCurrentSeason(),
            country:      $currentLeague->getCountry(),
            snapshotData: [
                'amp' => [
                    'leagueTier'    => $currentLeague->getTier(),
                    'leagueName'    => $currentLeague->getName(),
                    'finalPosition' => $dto->finalPosition,
                    'gamesPlayed'   => $dto->gamesPlayed,
                    'wins'          => $dto->wins,
                    'draws'         => $dto->draws,
                    'losses'        => $dto->losses,
                    'goalsFor'      => $dto->goalsFor,
                    'goalsAgainst'  => $dto->goalsAgainst,
                    'points'        => $dto->points,
                    'promoted'      => $dto->promoted,
                    'relegated'     => $dto->relegated,
                ],
                'pyramid' => $dto->pyramidSnapshot,
            ],
        );
        $this->em->persist($snapshot);

        $newLeague = null;
        if ($dto->promoted && $currentLeague->getTier() > 1) {
            $newLeague = $this->leagueRepository->findByCountryAndTier(
                $currentLeague->getCountry(),
                $currentLeague->getTier() - 1
            );
        } elseif ($dto->relegated && $currentLeague->getTier() < 8) {
            $newLeague = $this->leagueRepository->findByCountryAndTier(
                $currentLeague->getCountry(),
                $currentLeague->getTier() + 1
            );
        }

        if ($newLeague !== null) {
            $academy->setCurrentLeague($newLeague);
        }

        $academy->setCurrentSeason($academy->getCurrentSeason() + 1);
        $this->em->flush();

        return [
            'seasonRecordId' => (string) $record->getId(),
            'newLeague'      => $newLeague !== null ? [
                'id'   => (string) $newLeague->getId(),
                'tier' => $newLeague->getTier(),
                'name' => $newLeague->getName(),
            ] : null,
        ];
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
lando php bin/phpunit tests/Service/LeagueServiceTest.php --testdox
```
Expected: 4 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/Service/LeagueService.php tests/Service/LeagueServiceTest.php
git commit -m "feat: add LeagueService with generate, assign, and concludeSeason methods"
```

---

### Task 11: MatchResultDto + SyncRequest additions

**Files:**
- Create: `src/Dto/MatchResultDto.php`
- Modify: `src/Dto/SyncRequest.php`
- Test: `tests/Dto/MatchResultDtoTest.php`

- [ ] **Step 1: Write the failing test**

```php
// tests/Dto/MatchResultDtoTest.php
<?php

namespace App\Tests\Dto;

use App\Dto\MatchResultDto;
use App\Dto\SyncRequest;
use PHPUnit\Framework\TestCase;

class MatchResultDtoTest extends TestCase
{
    public function testMatchResultDtoDefaults(): void
    {
        $dto = new MatchResultDto();
        $this->assertSame('', $dto->opponentClubId);
        $this->assertSame(0,  $dto->goalsFor);
        $this->assertSame(0,  $dto->goalsAgainst);
        $this->assertSame(1,  $dto->week);
    }

    public function testSyncRequestMatchResultsDefaultsToEmpty(): void
    {
        $request = new SyncRequest();
        $this->assertSame([], $request->matchResults);
    }

    public function testSyncRequestSetMatchResultsFromArray(): void
    {
        $request = new SyncRequest();
        $request->setMatchResults([
            ['opponentClubId' => 'abc', 'goalsFor' => 2, 'goalsAgainst' => 1, 'week' => 5],
        ]);

        $this->assertCount(1, $request->matchResults);
        $this->assertInstanceOf(MatchResultDto::class, $request->matchResults[0]);
        $this->assertSame('abc', $request->matchResults[0]->opponentClubId);
        $this->assertSame(2,     $request->matchResults[0]->goalsFor);
        $this->assertSame(1,     $request->matchResults[0]->goalsAgainst);
        $this->assertSame(5,     $request->matchResults[0]->week);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
lando php bin/phpunit tests/Dto/MatchResultDtoTest.php --testdox
```
Expected: FAIL — class not found.

- [ ] **Step 3: Create MatchResultDto**

```php
// src/Dto/MatchResultDto.php
<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

class MatchResultDto
{
    #[Assert\Uuid]
    public string $opponentClubId = '';

    #[Assert\PositiveOrZero]
    public int $goalsFor = 0;

    #[Assert\PositiveOrZero]
    public int $goalsAgainst = 0;

    #[Assert\Positive]
    public int $week = 1;
}
```

- [ ] **Step 4: Add matchResults to SyncRequest**

Open `src/Dto/SyncRequest.php`. Add this import at the top:

```php
use Symfony\Component\Validator\Constraints as Assert;
```
(It's already there — just confirm. If not, add it.)

Add this property after the `$players` array (at the bottom of the class properties, before the closing brace):

```php
    /**
     * Match results since the last sync. Optional — defaults to empty.
     * Each entry: { opponentClubId, goalsFor, goalsAgainst, week }
     *
     * @var MatchResultDto[]
     */
    #[Assert\Valid]
    #[Assert\All([new Assert\Type(MatchResultDto::class)])]
    public array $matchResults = [];

    /**
     * @param array<array{opponentClubId?: string, goalsFor?: int, goalsAgainst?: int, week?: int}|MatchResultDto> $matchResults
     */
    public function setMatchResults(array $matchResults): void
    {
        $this->matchResults = array_map(static function (array|MatchResultDto $item): MatchResultDto {
            if ($item instanceof MatchResultDto) {
                return $item;
            }
            $dto                 = new MatchResultDto();
            $dto->opponentClubId = $item['opponentClubId'] ?? '';
            $dto->goalsFor       = (int) ($item['goalsFor'] ?? 0);
            $dto->goalsAgainst   = (int) ($item['goalsAgainst'] ?? 0);
            $dto->week           = (int) ($item['week'] ?? 1);
            return $dto;
        }, $matchResults);
    }
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
lando php bin/phpunit tests/Dto/MatchResultDtoTest.php --testdox
```
Expected: 3 tests, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/Dto/MatchResultDto.php src/Dto/SyncRequest.php tests/Dto/MatchResultDtoTest.php
git commit -m "feat: add MatchResultDto and matchResults field to SyncRequest"
```

---

### Task 12: SyncService — match result persistence + league snapshot

**Files:**
- Modify: `src/Service/SyncService.php`
- Test: `tests/Service/SyncServiceLeagueTest.php`

- [ ] **Step 1: Write the failing test**

```php
// tests/Service/SyncServiceLeagueTest.php
<?php

namespace App\Tests\Service;

use App\Entity\Academy;
use App\Entity\League;
use App\Entity\NpcClub;
use App\Entity\User;
use App\Repository\NpcClubRepository;
use PHPUnit\Framework\TestCase;

class SyncServiceLeagueTest extends TestCase
{
    public function testBuildLeagueSnapshotReturnsNullWhenNoLeague(): void
    {
        $user    = $this->createMock(User::class);
        $academy = new Academy('Test FC', $user);
        // no league set — currentLeague is null

        $npcRepo = $this->createMock(NpcClubRepository::class);
        $npcRepo->expects($this->never())->method('findByLeague');

        // Call the private method via reflection
        $service = $this->getMockBuilder(\App\Service\SyncService::class)
            ->disableOriginalConstructor()
            ->onlyMethods([])
            ->getMock();

        $reflection = new \ReflectionMethod(\App\Service\SyncService::class, 'buildLeagueSnapshot');
        $result = $reflection->invoke($service, $academy, $npcRepo);

        $this->assertNull($result);
    }

    public function testBuildLeagueSnapshotIncludesClubs(): void
    {
        $user    = $this->createMock(User::class);
        $academy = new Academy('Test FC', $user);
        $league  = new League('EN', 8, 'League 8');
        $academy->setCurrentLeague($league);
        $academy->setCurrentSeason(2);

        $club = new NpcClub('Norwich Town', 'EN', 8, 12, '#ffffff', '#000000', 100000, ['training_pitch' => 1]);
        $club->setStadiumName('Norwich Park');

        $npcRepo = $this->createMock(NpcClubRepository::class);
        $npcRepo->method('findByLeague')->with($league)->willReturn([$club]);

        $service = $this->getMockBuilder(\App\Service\SyncService::class)
            ->disableOriginalConstructor()
            ->onlyMethods([])
            ->getMock();

        $reflection = new \ReflectionMethod(\App\Service\SyncService::class, 'buildLeagueSnapshot');
        $result = $reflection->invoke($service, $academy, $npcRepo);

        $this->assertNotNull($result);
        $this->assertSame(8,          $result['tier']);
        $this->assertSame('League 8', $result['name']);
        $this->assertSame('EN',       $result['country']);
        $this->assertSame(2,          $result['season']);
        $this->assertCount(1, $result['clubs']);
        $this->assertSame('Norwich Town', $result['clubs'][0]['name']);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
lando php bin/phpunit tests/Service/SyncServiceLeagueTest.php --testdox
```
Expected: FAIL — method not found.

- [ ] **Step 3: Update SyncService**

Open `src/Service/SyncService.php`.

Add these imports:

```php
use App\Dto\MatchResultDto;
use App\Entity\MatchResult;
use App\Entity\NpcClub;
use App\Repository\MatchResultRepository;
use App\Repository\NpcClubRepository;
```

Add `MatchResultRepository` and `NpcClubRepository` to the constructor:

```php
    public function __construct(
        private readonly AcademyRepository          $academyRepository,
        private readonly LeaderboardEntryRepository $leaderboardEntryRepository,
        private readonly EntityManagerInterface     $em,
        private readonly EconomicService            $economicService,
        private readonly InboxService               $inboxService,
        private readonly GameConfigRepository       $gameConfigRepository,
        private readonly FacilityTemplateRepository $facilityTemplateRepository,
        private readonly NpcClubRepository          $npcClubRepository,
        private readonly MatchResultRepository      $matchResultRepository,
    ) {}
```

In the `process()` method, add match result processing just before `$this->em->flush()` (after the player updates block):

```php
        // ── Match result persistence ──────────────────────────────────────────
        if (!empty($request->matchResults)) {
            $this->processMatchResults($academy, $request->matchResults);
        }
```

In the `return [...]` array at the end of `process()`, add `'league'` after `'gameConfig'`:

```php
            'gameConfig'        => $gameConfigData,
            'league'            => $this->buildLeagueSnapshot($academy),
```

Add these two private methods at the bottom of the class, before the closing `}`:

```php
    /**
     * Persists MatchResult entities from sync payload.
     *
     * @param MatchResultDto[] $results
     */
    private function processMatchResults(Academy $academy, array $results): void
    {
        foreach ($results as $dto) {
            if (empty($dto->opponentClubId)) {
                continue;
            }
            $opponent = $this->npcClubRepository->find($dto->opponentClubId);
            if ($opponent === null) {
                continue; // silently skip unknown clubs
            }
            $matchResult = new MatchResult(
                academy:      $academy,
                opponentClub: $opponent,
                goalsFor:     $dto->goalsFor,
                goalsAgainst: $dto->goalsAgainst,
                week:         $dto->week,
                season:       $academy->getCurrentSeason(),
            );
            $this->em->persist($matchResult);
        }
    }

    /**
     * Builds the league snapshot array for the sync response.
     * Returns null if the academy has no current league.
     *
     * @return array{id: string, tier: int, name: string, country: string, season: int, clubs: array<int, array>}|null
     */
    private function buildLeagueSnapshot(Academy $academy, ?NpcClubRepository $npcRepo = null): ?array
    {
        $league = $academy->getCurrentLeague();
        if ($league === null) {
            return null;
        }
        $repo  = $npcRepo ?? $this->npcClubRepository;
        $clubs = $repo->findByLeague($league);
        return [
            'id'      => (string) $league->getId(),
            'tier'    => $league->getTier(),
            'name'    => $league->getName(),
            'country' => $league->getCountry(),
            'season'  => $academy->getCurrentSeason(),
            'clubs'   => array_map(fn(NpcClub $c) => [
                'id'             => (string) $c->getId(),
                'name'           => $c->getName(),
                'reputation'     => $c->getReputation(),
                'tier'           => $c->getTier(),
                'primaryColor'   => $c->getPrimaryColor(),
                'secondaryColor' => $c->getSecondaryColor(),
                'stadiumName'    => $c->getStadiumName(),
                'facilities'     => $c->getFacilities(),
            ], $clubs),
        ];
    }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
lando php bin/phpunit tests/Service/SyncServiceLeagueTest.php --testdox
```
Expected: 2 tests, 0 failures.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

```bash
lando php bin/phpunit --testdox 2>&1 | tail -10
```
Expected: same pass/fail ratio as before (pre-existing InboxServiceTest errors only).

- [ ] **Step 6: Commit**

```bash
git add src/Service/SyncService.php tests/Service/SyncServiceLeagueTest.php
git commit -m "feat: extend SyncService with match result persistence and league snapshot in response"
```

---

### Task 13: ConcludeSeasonRequest DTO + LeagueController

**Files:**
- Create: `src/Dto/ConcludeSeasonRequest.php`
- Create: `src/Controller/Api/LeagueController.php`
- Test: `tests/Controller/Api/LeagueControllerTest.php`

- [ ] **Step 1: Write the failing test**

```php
// tests/Controller/Api/LeagueControllerTest.php
<?php

namespace App\Tests\Controller\Api;

use App\Controller\Api\LeagueController;
use App\Dto\ConcludeSeasonRequest;
use PHPUnit\Framework\TestCase;

class LeagueControllerTest extends TestCase
{
    public function testConcludeSeasonRequestDefaults(): void
    {
        $dto = new ConcludeSeasonRequest();

        $this->assertSame(false, $dto->promoted);
        $this->assertSame(false, $dto->relegated);
        $this->assertSame([],    $dto->pyramidSnapshot);
        $this->assertSame(0,     $dto->gamesPlayed);
    }

    public function testControllerExists(): void
    {
        $this->assertTrue(class_exists(LeagueController::class));
    }

    public function testConcludeSeasonMethodExists(): void
    {
        $this->assertTrue(method_exists(LeagueController::class, 'concludeSeason'));
    }

    public function testSeasonHistoryMethodExists(): void
    {
        $this->assertTrue(method_exists(LeagueController::class, 'seasonHistory'));
    }

    public function testSeasonHistoryDetailMethodExists(): void
    {
        $this->assertTrue(method_exists(LeagueController::class, 'seasonHistoryDetail'));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
lando php bin/phpunit tests/Controller/Api/LeagueControllerTest.php --testdox
```
Expected: FAIL — classes not found.

- [ ] **Step 3: Create ConcludeSeasonRequest DTO**

```php
// src/Dto/ConcludeSeasonRequest.php
<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

class ConcludeSeasonRequest
{
    #[Assert\Positive]
    public int $finalPosition = 1;

    #[Assert\PositiveOrZero]
    public int $gamesPlayed = 0;

    #[Assert\PositiveOrZero]
    public int $wins = 0;

    #[Assert\PositiveOrZero]
    public int $draws = 0;

    #[Assert\PositiveOrZero]
    public int $losses = 0;

    #[Assert\PositiveOrZero]
    public int $goalsFor = 0;

    #[Assert\PositiveOrZero]
    public int $goalsAgainst = 0;

    #[Assert\PositiveOrZero]
    public int $points = 0;

    public bool $promoted = false;

    public bool $relegated = false;

    /**
     * Full pyramid standings sent by the client, keyed by tier number (as string).
     * e.g. { "1": { "name": "League 1", "standings": [...] }, "8": { ... } }
     *
     * @var array<string, array{name: string, standings: array<array{clubId: string, name: string, position: int, points: int, goalsFor: int, goalsAgainst: int, promoted: bool, relegated: bool}>}>
     */
    public array $pyramidSnapshot = [];
}
```

- [ ] **Step 4: Create LeagueController**

```php
// src/Controller/Api/LeagueController.php
<?php

namespace App\Controller\Api;

use App\Dto\ConcludeSeasonRequest;
use App\Entity\User;
use App\Repository\AcademyRepository;
use App\Repository\SeasonSnapshotRepository;
use App\Service\LeagueService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/league')]
#[IsGranted('ROLE_ACADEMY')]
class LeagueController extends AbstractController
{
    public function __construct(
        private readonly AcademyRepository        $academyRepository,
        private readonly LeagueService            $leagueService,
        private readonly SeasonSnapshotRepository $seasonSnapshotRepository,
    ) {}

    #[Route('/conclude-season', name: 'api_league_conclude_season', methods: ['POST'])]
    public function concludeSeason(#[MapRequestPayload] ConcludeSeasonRequest $dto): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized.'], 401);
        }

        $academy = $this->academyRepository->findByUser($user);
        if ($academy === null) {
            return $this->json(['error' => 'Academy not found.'], 404);
        }

        try {
            $result = $this->leagueService->concludeSeason($academy, $dto);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 422);
        }

        return $this->json($result);
    }

    #[Route('/season-history', name: 'api_league_season_history', methods: ['GET'])]
    public function seasonHistory(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized.'], 401);
        }

        $academy = $this->academyRepository->findByUser($user);
        if ($academy === null) {
            return $this->json(['error' => 'Academy not found.'], 404);
        }

        $snapshots = $this->seasonSnapshotRepository->findByAcademy($academy);

        return $this->json([
            'seasons' => array_map(fn($s) => [
                'id'            => (string) $s->getId(),
                'season'        => $s->getSeason(),
                'leagueTier'    => $s->getSnapshotData()['amp']['leagueTier'],
                'leagueName'    => $s->getSnapshotData()['amp']['leagueName'],
                'finalPosition' => $s->getSnapshotData()['amp']['finalPosition'],
                'points'        => $s->getSnapshotData()['amp']['points'],
                'promoted'      => $s->getSnapshotData()['amp']['promoted'],
                'relegated'     => $s->getSnapshotData()['amp']['relegated'],
            ], $snapshots),
        ]);
    }

    #[Route('/season-history/{season}', name: 'api_league_season_history_detail', methods: ['GET'])]
    public function seasonHistoryDetail(int $season): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'Unauthorized.'], 401);
        }

        $academy = $this->academyRepository->findByUser($user);
        if ($academy === null) {
            return $this->json(['error' => 'Academy not found.'], 404);
        }

        $snapshot = $this->seasonSnapshotRepository->findByAcademyAndSeason($academy, $season);
        if ($snapshot === null) {
            return $this->json(['error' => 'Season not found.'], 404);
        }

        return $this->json([
            'id'           => (string) $snapshot->getId(),
            'season'       => $snapshot->getSeason(),
            'country'      => $snapshot->getCountry(),
            'snapshotData' => $snapshot->getSnapshotData(),
        ]);
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
lando php bin/phpunit tests/Controller/Api/LeagueControllerTest.php --testdox
```
Expected: 5 tests, 0 failures.

- [ ] **Step 6: Verify routes are registered**

```bash
lando php bin/console debug:router | grep league
```
Expected output includes `api_league_conclude_season`, `api_league_season_history`, `api_league_season_history_detail`.

- [ ] **Step 7: Commit**

```bash
git add src/Dto/ConcludeSeasonRequest.php src/Controller/Api/LeagueController.php tests/Controller/Api/LeagueControllerTest.php
git commit -m "feat: add ConcludeSeasonRequest DTO and LeagueController with conclude-season + season-history endpoints"
```

---

### Task 14: NpcClubGenerationService — league auto-assignment

**Files:**
- Modify: `src/Service/NpcClubGenerationService.php`
- Test: `tests/Service/NpcClubGenerationServiceLeagueTest.php`

- [ ] **Step 1: Write the failing test**

```php
// tests/Service/NpcClubGenerationServiceLeagueTest.php
<?php

namespace App\Tests\Service;

use App\Entity\FacilityTemplate;
use App\Entity\League;
use App\Repository\FacilityTemplateRepository;
use App\Repository\NpcClubRepository;
use App\Service\LeagueService;
use App\Service\NpcClubGenerationService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

class NpcClubGenerationServiceLeagueTest extends TestCase
{
    private function makeService(bool $leagueExists = true): NpcClubGenerationService
    {
        $facilityRepo = $this->createMock(FacilityTemplateRepository::class);
        $facilityRepo->method('findBy')->willReturn([]);

        $npcClubRepo = $this->createMock(NpcClubRepository::class);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist')->willReturn(null);
        $em->method('flush')->willReturn(null);

        $leagueService = $this->createMock(LeagueService::class);
        if ($leagueExists) {
            $leagueService->expects($this->exactly(2))
                ->method('assignClubToLeague');
        } else {
            $leagueService->expects($this->exactly(2))
                ->method('assignClubToLeague');
        }

        return new NpcClubGenerationService($em, $facilityRepo, $npcClubRepo, $leagueService);
    }

    public function testGenerateClubsCallsAssignForEachClub(): void
    {
        $service = $this->makeService();
        $clubs   = $service->generateClubs(2, 4, 'EN');

        $this->assertCount(2, $clubs);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
lando php bin/phpunit tests/Service/NpcClubGenerationServiceLeagueTest.php --testdox
```
Expected: FAIL — constructor mismatch.

- [ ] **Step 3: Update NpcClubGenerationService**

Open `src/Service/NpcClubGenerationService.php`.

Add this import:

```php
use App\Service\LeagueService;
```

Update the constructor to inject `LeagueService`:

```php
    public function __construct(
        private readonly EntityManagerInterface     $em,
        private readonly FacilityTemplateRepository $facilityTemplateRepo,
        private readonly NpcClubRepository          $npcClubRepo,
        private readonly LeagueService              $leagueService,
    ) {}
```

In `generateClubs()`, add a call to `assignClubToLeague()` after `$this->em->persist($club)`:

```php
            $this->em->persist($club);
            $this->leagueService->assignClubToLeague($club);
            $clubs[] = $club;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
lando php bin/phpunit tests/Service/NpcClubGenerationServiceLeagueTest.php --testdox
```
Expected: 1 test, 0 failures.

- [ ] **Step 5: Run the original generation service tests to confirm no regressions**

```bash
lando php bin/phpunit tests/Service/NpcClubGenerationServiceTest.php --testdox
```
Expected: all pass (the original tests mock the repo). If they fail due to the constructor change, update the constructor call in each test to pass a `LeagueService` mock (use `$this->createMock(LeagueService::class)`).

- [ ] **Step 6: Commit**

```bash
git add src/Service/NpcClubGenerationService.php tests/Service/NpcClubGenerationServiceLeagueTest.php
git commit -m "feat: auto-assign NPC clubs to league on generation"
```

---

### Task 15: LeagueCrudController

**Files:**
- Create: `src/Controller/Admin/LeagueCrudController.php`
- Test: `tests/Controller/Admin/LeagueCrudControllerTest.php`

- [ ] **Step 1: Write the failing test**

```php
// tests/Controller/Admin/LeagueCrudControllerTest.php
<?php

namespace App\Tests\Controller\Admin;

use App\Controller\Admin\LeagueCrudController;
use App\Entity\League;
use PHPUnit\Framework\TestCase;

class LeagueCrudControllerTest extends TestCase
{
    public function testEntityFqcn(): void
    {
        $this->assertSame(League::class, LeagueCrudController::getEntityFqcn());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
lando php bin/phpunit tests/Controller/Admin/LeagueCrudControllerTest.php --testdox
```
Expected: FAIL — class not found.

- [ ] **Step 3: Create the controller**

```php
// src/Controller/Admin/LeagueCrudController.php
<?php

namespace App\Controller\Admin;

use App\Entity\League;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

class LeagueCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return League::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud->setDefaultSort(['country' => 'ASC', 'tier' => 'ASC']);
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->hideOnForm();
        yield TextField::new('country')
            ->setHelp('ISO 2-letter code, e.g. ES, EN, DE');
        yield IntegerField::new('tier')
            ->setHelp('1 (top) to 8 (bottom)');
        yield TextField::new('name')
            ->setHelp('Default "League {tier}", overridable e.g. "Premier League"');
        yield DateTimeField::new('createdAt')->hideOnForm();
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
lando php bin/phpunit tests/Controller/Admin/LeagueCrudControllerTest.php --testdox
```
Expected: 1 test, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/Controller/Admin/LeagueCrudController.php tests/Controller/Admin/LeagueCrudControllerTest.php
git commit -m "feat: add LeagueCrudController for EasyAdmin league management"
```

---

### Task 16: DashboardController — generateLeagues route + StarterConfig save + menu

**Files:**
- Modify: `src/Controller/Admin/DashboardController.php`

- [ ] **Step 1: Add LeagueService and LeagueRepository imports and constructor injection**

Open `src/Controller/Admin/DashboardController.php`.

Add these imports after the existing `use` statements:

```php
use App\Controller\Admin\LeagueCrudController;
use App\Repository\LeagueRepository;
use App\Service\LeagueService;
use App\Enum\ReputationTier;
```

Update the constructor to add `LeagueRepository` and `LeagueService`:

```php
    public function __construct(
        private EntityManagerInterface      $em,
        private GameConfigRepository        $gameConfigRepository,
        private StarterConfigRepository     $starterConfigRepository,
        private PoolConfigRepository        $poolConfigRepository,
        private MarketPoolService           $marketPoolService,
        private PlayerRepository            $playerRepository,
        private NpcClubGenerationService    $npcClubGenerationService,
        private NpcClubRepository           $npcClubRepository,
        private LeagueRepository            $leagueRepository,
        private LeagueService               $leagueService,
    ) {}
```

- [ ] **Step 2: Add generateLeagues route**

Add this method inside `DashboardController`, after the `replenishSeniorPool()` method:

```php
    #[Route('/admin/leagues/generate', name: 'admin_leagues_generate', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function generateLeagues(Request $request): Response
    {
        if (!$this->isCsrfTokenValid('generate_leagues', $request->request->get('_token'))) {
            $this->addFlash('danger', 'Invalid CSRF token.');
            return $this->redirect($this->generateUrl('admin', ['routeName' => 'admin_npc_clubs_content']));
        }

        $country = strtoupper(trim($request->request->get('country', '')));
        if ($country === '') {
            $this->addFlash('danger', 'Country is required.');
            return $this->redirect($this->generateUrl('admin', ['routeName' => 'admin_npc_clubs_content']));
        }

        $created  = $this->leagueService->generateLeaguesForCountry($country);
        $skipped  = 8 - count($created);
        $msg      = sprintf('Created %d leagues for %s', count($created), $country);
        if ($skipped > 0) {
            $msg .= sprintf(', %d already existed', $skipped);
        }
        $this->addFlash('success', $msg . '.');

        return $this->redirect($this->generateUrl('admin', ['routeName' => 'admin_npc_clubs_content']));
    }
```

- [ ] **Step 3: Update saveStarterConfig to handle new fields**

Find the `saveStarterConfig()` method. After the existing `setStarterSponsorTier()` line, add:

```php
        $config->setStarterSponsorTier($request->request->get('starterSponsorTier', 'SMALL'));

        $config->setDefaultFacilitiesJson($request->request->get('defaultFacilities', '{}'));

        $reputationTierValue = $request->request->get('starterReputationTier', 'local');
        $reputationTier      = ReputationTier::tryFrom($reputationTierValue) ?? ReputationTier::LOCAL;
        $config->setStarterReputationTier($reputationTier);
```

(Replace the existing `$config->setStarterSponsorTier(...)` line with this block to keep ordering clean.)

- [ ] **Step 4: Add League to the sidebar menu**

Find the `configureMenuItems()` method. Locate the `Clubs & Leagues` section and add `Leagues` between `NPC Clubs` and `Generate`:

```php
        yield MenuItem::section('Clubs & Leagues');
        yield MenuItem::linkTo(NpcClubCrudController::class, 'NPC Clubs', 'fa fa-shield-halved');
        yield MenuItem::linkTo(LeagueCrudController::class, 'Leagues', 'fa fa-trophy');
        yield MenuItem::linkToRoute('Generate', 'fa fa-wand-magic-sparkles', 'admin_npc_clubs_content');
```

- [ ] **Step 5: Clear cache and verify routes**

```bash
lando php bin/console cache:clear
lando php bin/console debug:router | grep -E "admin_leagues|admin_npc_clubs"
```
Expected: `admin_leagues_generate` appears alongside existing NPC club routes.

- [ ] **Step 6: Commit**

```bash
git add src/Controller/Admin/DashboardController.php
git commit -m "feat: add generateLeagues admin route, update StarterConfig save, add Leagues sidebar item"
```

---

### Task 17: Admin templates

**Files:**
- Modify: `templates/admin/npc_clubs_content.html.twig`
- Modify: `templates/admin/starter_config.html.twig`

- [ ] **Step 1: Add Generate League Structure card to npc_clubs_content.html.twig**

Open `templates/admin/npc_clubs_content.html.twig`. Find the closing `</div>` before `{% endblock %}` and add this card before it:

```twig
    {# ── Generate League Structure ───────────────────────────────────────── #}
    <div class="col-12 col-lg-4">
        <div class="card h-100">
            <div class="card-header py-2 d-flex align-items-center gap-2">
                <i class="fa fa-trophy text-warning"></i>
                <span class="fw-semibold small">Generate League Structure</span>
            </div>
            <div class="card-body d-flex flex-column gap-3">
                <p class="text-muted small mb-0">
                    Auto-creates 8 League records (tiers 1–8) for a country, named
                    "League 1" through "League 8". Skips tiers that already exist.
                    Run this before generating clubs so clubs are auto-assigned to their league.
                </p>
                <div class="mt-auto">
                    <form method="POST" action="{{ path('admin_leagues_generate') }}">
                        <input type="hidden" name="_token" value="{{ csrf_token('generate_leagues') }}">
                        <div class="mb-3">
                            <label for="league_country" class="form-label fw-semibold small">Country (ISO)</label>
                            <select id="league_country" name="country" class="form-select form-select-sm">
                                <option value="ES">Spain (ES)</option>
                                <option value="EN">England (EN)</option>
                                <option value="DE">Germany (DE)</option>
                                <option value="IT">Italy (IT)</option>
                                <option value="FR">France (FR)</option>
                                <option value="BR">Brazil (BR)</option>
                                <option value="AR">Argentina (AR)</option>
                                <option value="NL">Netherlands (NL)</option>
                                <option value="PT">Portugal (PT)</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-warning btn-sm">
                            <i class="fa fa-trophy me-1"></i>Generate Leagues
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
```

Also update the Generate Clubs card (`col-12 col-lg-5`) to `col-12 col-lg-4` to keep the row balanced with three cards across the bottom.

- [ ] **Step 2: Add new fields to starter_config.html.twig**

Open `templates/admin/starter_config.html.twig`. Before the closing `</div>` of the `.row.g-3` inside the card body, add:

```twig
                    <div class="col-md-6">
                        <label for="starterReputationTier" class="form-label fw-semibold small">Starter Reputation Tier</label>
                        <select id="starterReputationTier" name="starterReputationTier" class="form-select">
                            <option value="local"    {% if config.starterReputationTier.value == 'local'    %}selected{% endif %}>Local</option>
                            <option value="regional" {% if config.starterReputationTier.value == 'regional' %}selected{% endif %}>Regional</option>
                            <option value="national" {% if config.starterReputationTier.value == 'national' %}selected{% endif %}>National</option>
                            <option value="elite"    {% if config.starterReputationTier.value == 'elite'    %}selected{% endif %}>Elite</option>
                        </select>
                        <div class="form-text">Club reputation band at creation. Default: Local</div>
                    </div>

                    <div class="col-12">
                        <label for="defaultFacilities" class="form-label fw-semibold small">Default Facilities (JSON)</label>
                        <textarea id="defaultFacilities" name="defaultFacilities"
                                  class="form-control font-monospace" rows="6">{{ config.defaultFacilitiesJson }}</textarea>
                        <div class="form-text">
                            Flat slug → level map, e.g. <code>{"training_pitch": 1, "north_stand": 0}</code>.
                            Leave as <code>{}</code> for no default facilities.
                        </div>
                    </div>
```

- [ ] **Step 3: Clear cache and smoke test**

```bash
lando php bin/console cache:clear
```

Open `https://wunderkind-backend.lndo.site/admin?routeName=admin_npc_clubs_content` — confirm the Generate League Structure card is visible.

Open `https://wunderkind-backend.lndo.site/admin?routeName=admin_starter_config` — confirm the Starter Reputation Tier dropdown and Default Facilities textarea are visible.

- [ ] **Step 4: Commit**

```bash
git add templates/admin/npc_clubs_content.html.twig templates/admin/starter_config.html.twig
git commit -m "feat: add Generate League Structure card and starter config league fields to admin templates"
```

---

### Task 18: Full test suite + verification

- [ ] **Step 1: Run full test suite**

```bash
lando php bin/phpunit --testdox 2>&1 | tail -15
```
Expected: all new tests pass. Pre-existing `InboxServiceTest` failures (8 errors) are known and unrelated to this feature.

- [ ] **Step 2: Verify all new routes**

```bash
lando php bin/console debug:router | grep -E "league|conclude"
```
Expected:
```
api_league_conclude_season        POST   /api/league/conclude-season
api_league_season_history         GET    /api/league/season-history
api_league_season_history_detail  GET    /api/league/season-history/{season}
admin_leagues_generate            POST   /admin/leagues/generate
admin_league_index                GET    /admin/league
```

- [ ] **Step 3: Validate schema**

```bash
lando php bin/console doctrine:schema:validate
```
Expected: `[OK] The database schema is in sync with the mapping files.`

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: verify full test suite and routes for league competition system"
```
