import { randomBytes } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  LocationType,
  NotificationType,
  Priority,
  RequestStatus,
  RequestType,
  Role,
} from "../src/generated/prisma/enums";

/**
 * Development Architecture §8.2 — demonstration data so every flow can be exercised without
 * clicking the system into existence first.
 *
 * The case study is Qendra e Studentëve, Prishtinë (Domain Analysis §1). Two dormitories exist
 * on purpose: BR-08 and EF-03 say an administrator may only see their own, and that is impossible
 * to demonstrate — or test — with a single one.
 *
 * Demo requests are backdated across several weeks so the statistics charts have a real trend
 * on first load and the resolution-time figures the thesis needs are non-trivial.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEMO_PASSWORD = "dormmate123";

/** Deterministic pseudo-randomness, so a reseed produces the same demo dataset. */
let seedCounter = 0;
function nextInt(max: number): number {
  seedCounter = (seedCounter * 1103515245 + 12345) & 0x7fffffff;
  return seedCounter % max;
}

function daysAgo(days: number, hourOfDay = 9): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hourOfDay, nextInt(60), 0, 0);
  return d;
}

function hoursAfter(start: Date, hours: number): Date {
  return new Date(start.getTime() + hours * 3_600_000);
}

const MAINTENANCE_CATEGORIES = [
  { slug: "elektrike", name: "Elektrike", description: "Ndriçimi, prizat, instalimet elektrike" },
  { slug: "hidraulike", name: "Hidraulike", description: "Rubinetat, tubacionet, rrjedhjet e ujit" },
  { slug: "ngrohje", name: "Ngrohje", description: "Radiatorët dhe sistemi i ngrohjes" },
  { slug: "mobilje", name: "Mobilje", description: "Krevatet, tavolinat, karriget, dollapët" },
  { slug: "pastrim", name: "Pastrim", description: "Higjiena e hapësirave të përbashkëta" },
  { slug: "dyer-dritare", name: "Dyer dhe dritare", description: "Bravat, xhamat, kornizat" },
  { slug: "internet", name: "Internet", description: "Rrjeti dhe lidhja me internetin" },
  { slug: "tjeter", name: "Tjetër", description: "Probleme që nuk hyjnë në kategoritë e tjera" },
];

const ADMINISTRATIVE_CATEGORIES = [
  { slug: "certifikate-banimi", name: "Certifikatë banimi", description: "Vërtetim që studenti banon në konvikt" },
  { slug: "nderrim-dhome", name: "Ndërrim dhome", description: "Kërkesë për transferim në një dhomë tjetër" },
  { slug: "kerkese-pushim", name: "Kërkesë për pushim", description: "Njoftim për mungesë të gjatë nga konvikti" },
  { slug: "ankese", name: "Ankesë", description: "Ankesa lidhur me banimin ose bashkëbanuesit" },
  { slug: "dokumentacion", name: "Dokumentacion", description: "Kërkesa për dokumente zyrtare" },
  { slug: "tjeter", name: "Tjetër", description: "Kërkesa të tjera administrative" },
];

async function main() {
  console.log("Seeding DormMate...\n");

  // Order matters: children before parents, because of onDelete: Restrict on requests.
  await prisma.notification.deleteMany();
  await prisma.requestStatusHistory.deleteMany();
  await prisma.maintenanceRequestPhoto.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.administrativeRequest.deleteMany();
  await prisma.announcementDormitory.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.passwordResetRequest.deleteMany();
  await prisma.qRCode.deleteMany();
  // Detach students from rooms before locations are removed.
  await prisma.user.updateMany({ data: { roomId: null } });
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dormitory.deleteMany();
  await prisma.maintenanceCategory.deleteMany();
  await prisma.administrativeCategory.deleteMany();
  console.log("  cleared existing data");

  const passwordHash = await hash(DEMO_PASSWORD, 10);

  // --- Categories ---------------------------------------------------------
  await prisma.maintenanceCategory.createMany({ data: MAINTENANCE_CATEGORIES });
  await prisma.administrativeCategory.createMany({ data: ADMINISTRATIVE_CATEGORIES });
  const maintenanceCategories = await prisma.maintenanceCategory.findMany();
  const administrativeCategories = await prisma.administrativeCategory.findMany();
  console.log(
    `  ${maintenanceCategories.length} maintenance + ${administrativeCategories.length} administrative categories`,
  );

  // --- Dormitories --------------------------------------------------------
  const dormA = await prisma.dormitory.create({
    data: {
      name: "Konvikti 1 — Qendra e Studentëve",
      code: "QS-K1",
      address: "Rruga e Studentëve, Prishtinë",
    },
  });

  const dormB = await prisma.dormitory.create({
    data: {
      name: "Konvikti 2 — Qendra e Studentëve",
      code: "QS-K2",
      address: "Rruga e Studentëve, Prishtinë",
    },
  });
  console.log("  2 dormitories");

  // --- Locations ----------------------------------------------------------
  // Each dormitory: rooms on 3 floors plus the shared spaces students report on (§9.3).
  async function createLocations(dormitoryId: string, roomPrefix: string) {
    const rooms: { id: string; label: string }[] = [];

    for (let floor = 1; floor <= 3; floor++) {
      for (let n = 1; n <= 6; n++) {
        const label = `${roomPrefix}${floor}${String(n).padStart(2, "0")}`;
        const room = await prisma.location.create({
          data: { dormitoryId, type: LocationType.ROOM, label, floor },
        });
        rooms.push({ id: room.id, label });
      }
    }

    const shared: { id: string; label: string }[] = [];
    const sharedSpecs: { type: LocationType; label: string; floor: number | null }[] = [
      { type: LocationType.ENTRANCE, label: "Hyrja kryesore", floor: 0 },
    ];
    // Corridors, bathrooms and showers exist on every floor.
    for (let floor = 1; floor <= 3; floor++) {
      sharedSpecs.push({ type: LocationType.HALLWAY, label: `Korridori ${floor}`, floor });
      sharedSpecs.push({ type: LocationType.BATHROOM, label: `Tualeti ${floor}`, floor });
      sharedSpecs.push({ type: LocationType.SHOWER, label: `Dushet ${floor}`, floor });
    }

    for (const spec of sharedSpecs) {
      const loc = await prisma.location.create({
        data: { dormitoryId, type: spec.type, label: spec.label, floor: spec.floor },
      });
      shared.push({ id: loc.id, label: spec.label });
    }

    return { rooms, shared };
  }

  const locA = await createLocations(dormA.id, "A");
  const locB = await createLocations(dormB.id, "B");
  console.log(
    `  ${locA.rooms.length + locB.rooms.length} rooms + ${locA.shared.length + locB.shared.length} shared locations`,
  );

  // --- Users --------------------------------------------------------------
  const adminA = await prisma.user.create({
    data: {
      firstName: "Arben",
      lastName: "Krasniqi",
      personalNumber: "1000000001",
      email: "arben.krasniqi@qs-prishtine.org",
      phone: "+383 44 100 001",
      passwordHash,
      role: Role.ADMIN,
      dormitoryId: dormA.id,
    },
  });

  const adminB = await prisma.user.create({
    data: {
      firstName: "Teuta",
      lastName: "Berisha",
      personalNumber: "1000000002",
      email: "teuta.berisha@qs-prishtine.org",
      phone: "+383 44 100 002",
      passwordHash,
      role: Role.ADMIN,
      dormitoryId: dormB.id,
    },
  });

  const STUDENTS_A = [
    { firstName: "Robert", lastName: "Morina", personalNumber: "2000000001" },
    { firstName: "Elira", lastName: "Gashi", personalNumber: "2000000002" },
    { firstName: "Drin", lastName: "Hoxha", personalNumber: "2000000003" },
    { firstName: "Rina", lastName: "Sylejmani", personalNumber: "2000000004" },
    { firstName: "Blerim", lastName: "Rexhepi", personalNumber: "2000000005" },
    { firstName: "Arta", lastName: "Kelmendi", personalNumber: "2000000006" },
  ];

  const STUDENTS_B = [
    { firstName: "Endrit", lastName: "Zeqiri", personalNumber: "2000000007" },
    { firstName: "Lira", lastName: "Bytyqi", personalNumber: "2000000008" },
  ];

  type SeedStudent = { id: string; firstName: string; lastName: string };

  const studentsA: SeedStudent[] = [];
  for (const [i, s] of STUDENTS_A.entries()) {
    studentsA.push(
      await prisma.user.create({
        data: {
          ...s,
          email: `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}@student.uni-pr.edu`,
          phone: `+383 45 200 ${String(i + 1).padStart(3, "0")}`,
          passwordHash,
          role: Role.STUDENT,
          dormitoryId: dormA.id,
          roomId: locA.rooms[i].id,
        },
      }),
    );
  }

  const studentsB: SeedStudent[] = [];
  for (const [i, s] of STUDENTS_B.entries()) {
    studentsB.push(
      await prisma.user.create({
        data: {
          ...s,
          email: `${s.firstName.toLowerCase()}.${s.lastName.toLowerCase()}@student.uni-pr.edu`,
          phone: `+383 45 300 ${String(i + 1).padStart(3, "0")}`,
          passwordHash,
          role: Role.STUDENT,
          dormitoryId: dormB.id,
          roomId: locB.rooms[i].id,
        },
      }),
    );
  }
  console.log(`  2 administrators + ${studentsA.length + studentsB.length} students`);

  // --- QR codes -----------------------------------------------------------
  // The user's rule: an administrator generates a code AND assigns its location. Seeded codes are
  // already assigned so the scan flow can be demonstrated immediately.
  const allLocations = await prisma.location.findMany({ select: { id: true, dormitoryId: true } });
  for (const loc of allLocations) {
    await prisma.qRCode.create({
      data: {
        token: randomBytes(9).toString("base64url"),
        locationId: loc.id,
        createdById: loc.dormitoryId === dormA.id ? adminA.id : adminB.id,
      },
    });
  }
  console.log(`  ${allLocations.length} QR codes (one per location)`);

  // --- Maintenance requests ----------------------------------------------
  const catBySlug = new Map(maintenanceCategories.map((c) => [c.slug, c]));

  type RequestSpec = {
    student: { id: string; firstName: string; lastName: string };
    locationId: string;
    categorySlug: string;
    title: string;
    description: string;
    priority: Priority;
    status: RequestStatus;
    createdDaysAgo: number;
    resolveAfterHours?: number;
    viaQr?: boolean;
  };

  const specs: RequestSpec[] = [
    {
      student: studentsA[0],
      locationId: locA.rooms[0].id,
      categorySlug: "hidraulike",
      title: "Rubineti i lavamanit pikon vazhdimisht",
      description:
        "Rubineti në lavaman pikon edhe kur është i mbyllur plotësisht. Uji rrjedh gjatë gjithë natës dhe dëgjohet qartë.",
      priority: Priority.MEDIUM,
      status: RequestStatus.RESOLVED,
      createdDaysAgo: 26,
      resolveAfterHours: 30,
      viaQr: true,
    },
    {
      student: studentsA[1],
      locationId: locA.shared[4].id,
      categorySlug: "elektrike",
      title: "Llamba e korridorit nuk ndizet",
      description: "Ndriçimi në korridorin e katit të dytë ka rënë. Në mbrëmje është krejt errët.",
      priority: Priority.HIGH,
      status: RequestStatus.RESOLVED,
      createdDaysAgo: 22,
      resolveAfterHours: 20,
    },
    {
      student: studentsA[2],
      locationId: locA.rooms[2].id,
      categorySlug: "ngrohje",
      title: "Radiatori nuk ngrohet",
      description: "Radiatori mbetet i ftohtë edhe pse sistemi i ngrohjes është aktiv në dhomat fqinje.",
      priority: Priority.HIGH,
      status: RequestStatus.RESOLVED,
      createdDaysAgo: 19,
      resolveAfterHours: 52,
      viaQr: true,
    },
    {
      student: studentsA[3],
      locationId: locA.shared[9].id,
      categorySlug: "pastrim",
      title: "Dushet kanë nevojë për pastrim",
      description: "Dushet e katit të tretë nuk janë pastruar prej disa ditësh.",
      priority: Priority.LOW,
      status: RequestStatus.RESOLVED,
      createdDaysAgo: 15,
      resolveAfterHours: 12,
    },
    {
      student: studentsA[0],
      locationId: locA.rooms[0].id,
      categorySlug: "mobilje",
      title: "Këmba e tavolinës është e lirshme",
      description: "Tavolina lëkundet sepse një këmbë është liruar nga vidhat.",
      priority: Priority.LOW,
      status: RequestStatus.RESOLVED,
      createdDaysAgo: 12,
      resolveAfterHours: 44,
      viaQr: true,
    },
    {
      student: studentsA[4],
      locationId: locA.shared[0].id,
      categorySlug: "dyer-dritare",
      title: "Brava e hyrjes kryesore bllokohet",
      description: "Brava e derës kryesore ngec dhe duhet forcë e madhe për ta hapur.",
      priority: Priority.URGENT,
      status: RequestStatus.IN_PROGRESS,
      createdDaysAgo: 6,
    },
    {
      student: studentsA[1],
      locationId: locA.rooms[1].id,
      categorySlug: "internet",
      title: "Interneti shkëputet vazhdimisht",
      description: "Lidhja me internetin shkëputet çdo pak minuta, sidomos në mbrëmje.",
      priority: Priority.MEDIUM,
      status: RequestStatus.IN_PROGRESS,
      createdDaysAgo: 4,
      viaQr: true,
    },
    {
      student: studentsA[5],
      locationId: locA.shared[7].id,
      categorySlug: "hidraulike",
      title: "Tualeti i katit të dytë është i bllokuar",
      description: "Uji nuk kalon dhe tualeti nuk mund të përdoret.",
      priority: Priority.URGENT,
      status: RequestStatus.PENDING,
      createdDaysAgo: 2,
    },
    {
      student: studentsA[2],
      locationId: locA.rooms[2].id,
      categorySlug: "elektrike",
      title: "Priza pranë krevatit nuk punon",
      description: "Priza afër krevatit nuk jep rrymë. Të tjerat në dhomë funksionojnë normalisht.",
      priority: Priority.MEDIUM,
      status: RequestStatus.PENDING,
      createdDaysAgo: 1,
      viaQr: true,
    },
    {
      student: studentsA[3],
      locationId: locA.rooms[3].id,
      categorySlug: "mobilje",
      title: "Dera e dollapit është shkëputur",
      description: "Menteshat e derës së dollapit janë shkëputur dhe dera nuk mbyllet.",
      priority: Priority.LOW,
      status: RequestStatus.PENDING,
      createdDaysAgo: 0,
      viaQr: true,
    },
    // Dormitory 2 — proves BR-08 scoping: administrator A must never see these.
    {
      student: studentsB[0],
      locationId: locB.rooms[0].id,
      categorySlug: "ngrohje",
      title: "Radiatori pikon ujë",
      description: "Nga valvula e radiatorit pikon ujë mbi dysheme.",
      priority: Priority.HIGH,
      status: RequestStatus.IN_PROGRESS,
      createdDaysAgo: 5,
      viaQr: true,
    },
    {
      student: studentsB[1],
      locationId: locB.shared[1].id,
      categorySlug: "pastrim",
      title: "Korridori i katit të parë ka nevojë për pastrim",
      description: "Ka mbeturina të grumbulluara në korridor.",
      priority: Priority.LOW,
      status: RequestStatus.PENDING,
      createdDaysAgo: 3,
    },
  ];

  for (const spec of specs) {
    const dormitoryId = studentsA.some((s) => s.id === spec.student.id) ? dormA.id : dormB.id;
    const admin = dormitoryId === dormA.id ? adminA : adminB;
    const createdAt = daysAgo(spec.createdDaysAgo, 8 + nextInt(9));
    const resolvedAt =
      spec.status === RequestStatus.RESOLVED && spec.resolveAfterHours
        ? hoursAfter(createdAt, spec.resolveAfterHours)
        : null;

    const request = await prisma.maintenanceRequest.create({
      data: {
        title: spec.title,
        description: spec.description,
        status: spec.status,
        priority: spec.priority,
        reportedViaQr: spec.viaQr ?? false,
        studentId: spec.student.id,
        locationId: spec.locationId,
        dormitoryId,
        categoryId: catBySlug.get(spec.categorySlug)!.id,
        assignedAdminId: admin.id,
        createdAt,
        resolvedAt,
      },
    });

    // Status history — the trail the request timeline and the H1 resolution-time analysis read.
    await prisma.requestStatusHistory.create({
      data: {
        requestType: RequestType.MAINTENANCE,
        requestId: request.id,
        fromStatus: null,
        toStatus: RequestStatus.PENDING,
        changedById: spec.student.id,
        changedAt: createdAt,
      },
    });

    if (spec.status !== RequestStatus.PENDING) {
      const startedAt = hoursAfter(createdAt, 2 + nextInt(6));
      await prisma.requestStatusHistory.create({
        data: {
          requestType: RequestType.MAINTENANCE,
          requestId: request.id,
          fromStatus: RequestStatus.PENDING,
          toStatus: RequestStatus.IN_PROGRESS,
          changedById: admin.id,
          changedAt: startedAt,
        },
      });
    }

    if (resolvedAt) {
      await prisma.requestStatusHistory.create({
        data: {
          requestType: RequestType.MAINTENANCE,
          requestId: request.id,
          fromStatus: RequestStatus.IN_PROGRESS,
          toStatus: RequestStatus.RESOLVED,
          changedById: admin.id,
          changedAt: resolvedAt,
          note: "Problemi u zgjidh nga ekipi i mirëmbajtjes.",
        },
      });

      await prisma.notification.create({
        data: {
          userId: spec.student.id,
          type: NotificationType.STATUS_CHANGED,
          title: `Kërkesa MR-${String(request.number).padStart(5, "0")} — E Zgjidhur`,
          message: 'Statusi i kërkesës suaj u ndryshua në "E Zgjidhur".',
          link: `/maintenance/${request.number}`,
          isRead: spec.createdDaysAgo > 14,
          createdAt: resolvedAt,
        },
      });
    }
  }
  console.log(`  ${specs.length} maintenance requests with status history`);

  // --- Administrative requests -------------------------------------------
  const adminCatBySlug = new Map(administrativeCategories.map((c) => [c.slug, c]));

  const adminSpecs = [
    {
      student: studentsA[0],
      categorySlug: "certifikate-banimi",
      subject: "Certifikatë banimi për bursë",
      description:
        "Kam nevojë për një certifikatë që vërteton se banoj në konvikt, për aplikimin për bursë studimi.",
      status: RequestStatus.RESOLVED,
      createdDaysAgo: 18,
      resolveAfterHours: 26,
      response:
        "Certifikata është përgatitur dhe mund të tërhiqet në zyrën e administratës çdo ditë pune, ora 09:00–15:00.",
    },
    {
      student: studentsA[1],
      categorySlug: "nderrim-dhome",
      subject: "Kërkesë për ndërrim dhome",
      description: "Dëshiroj të transferohem në një dhomë tjetër për arsye studimi dhe qetësie.",
      status: RequestStatus.IN_PROGRESS,
      createdDaysAgo: 7,
      response: null,
    },
    {
      student: studentsA[2],
      categorySlug: "kerkese-pushim",
      subject: "Njoftim për mungesë gjatë pushimeve",
      description: "Do të mungoj nga konvikti nga data 20 deri më 30 të muajit.",
      status: RequestStatus.PENDING,
      createdDaysAgo: 2,
      response: null,
    },
    {
      student: studentsA[4],
      categorySlug: "dokumentacion",
      subject: "Kopje e kontratës së banimit",
      description: "Kërkoj një kopje të kontratës sime të banimit për dokumentacion personal.",
      status: RequestStatus.PENDING,
      createdDaysAgo: 0,
      response: null,
    },
    {
      student: studentsB[0],
      categorySlug: "ankese",
      subject: "Zhurmë gjatë orëve të vona",
      description: "Ka zhurmë të vazhdueshme në korridor pas orës 23:00.",
      status: RequestStatus.IN_PROGRESS,
      createdDaysAgo: 4,
      response: null,
    },
  ];

  for (const spec of adminSpecs) {
    const dormitoryId = studentsA.some((s) => s.id === spec.student.id) ? dormA.id : dormB.id;
    const admin = dormitoryId === dormA.id ? adminA : adminB;
    const createdAt = daysAgo(spec.createdDaysAgo, 10 + nextInt(6));
    const resolvedAt =
      spec.status === RequestStatus.RESOLVED && spec.resolveAfterHours
        ? hoursAfter(createdAt, spec.resolveAfterHours)
        : null;

    const request = await prisma.administrativeRequest.create({
      data: {
        subject: spec.subject,
        description: spec.description,
        status: spec.status,
        adminResponse: spec.response,
        studentId: spec.student.id,
        dormitoryId,
        categoryId: adminCatBySlug.get(spec.categorySlug)!.id,
        assignedAdminId: admin.id,
        createdAt,
        resolvedAt,
      },
    });

    await prisma.requestStatusHistory.create({
      data: {
        requestType: RequestType.ADMINISTRATIVE,
        requestId: request.id,
        fromStatus: null,
        toStatus: RequestStatus.PENDING,
        changedById: spec.student.id,
        changedAt: createdAt,
      },
    });

    if (spec.status !== RequestStatus.PENDING) {
      await prisma.requestStatusHistory.create({
        data: {
          requestType: RequestType.ADMINISTRATIVE,
          requestId: request.id,
          fromStatus: RequestStatus.PENDING,
          toStatus: RequestStatus.IN_PROGRESS,
          changedById: admin.id,
          changedAt: hoursAfter(createdAt, 3 + nextInt(8)),
        },
      });
    }

    if (resolvedAt) {
      await prisma.requestStatusHistory.create({
        data: {
          requestType: RequestType.ADMINISTRATIVE,
          requestId: request.id,
          fromStatus: RequestStatus.IN_PROGRESS,
          toStatus: RequestStatus.RESOLVED,
          changedById: admin.id,
          changedAt: resolvedAt,
        },
      });
    }
  }
  console.log(`  ${adminSpecs.length} administrative requests`);

  // --- Announcements ------------------------------------------------------
  const announcements = [
    {
      title: "Ndërprerje e ujit të martën, 09:00–14:00",
      body: "Të martën do të ketë ndërprerje të furnizimit me ujë nga ora 09:00 deri në 14:00 për shkak të punimeve në rrjetin kryesor. Ju lutemi të siguroni ujë për nevojat tuaja gjatë kësaj periudhe.",
      scope: "DORMITORY" as const,
      dormitoryIds: [dormA.id],
      author: adminA,
      daysAgo: 3,
    },
    {
      title: "Rregullat e reja të qetësisë",
      body: "Duke filluar nga java e ardhshme, orari i qetësisë do të jetë nga ora 23:00 deri në 07:00. Ju lutemi të respektoni bashkëbanuesit dhe të mbani nivelin e zhurmës sa më të ulët gjatë këtyre orëve.",
      scope: "GLOBAL" as const,
      dormitoryIds: [],
      author: adminA,
      daysAgo: 9,
    },
    {
      title: "Mirëmbajtje e planifikuar e ashensorit",
      body: "Ashensori do të jetë jashtë funksionit të enjten nga ora 08:00 deri në 16:00 për mirëmbajtje periodike. Ju lutemi përdorni shkallët gjatë kësaj kohe.",
      scope: "DORMITORY" as const,
      dormitoryIds: [dormA.id, dormB.id],
      author: adminA,
      daysAgo: 14,
    },
  ];

  for (const a of announcements) {
    const publishedAt = daysAgo(a.daysAgo, 11);
    const created = await prisma.announcement.create({
      data: {
        title: a.title,
        body: a.body,
        scope: a.scope,
        isPublished: true,
        publishedAt,
        createdAt: publishedAt,
        authorId: a.author.id,
        dormitories: {
          create: a.dormitoryIds.map((dormitoryId) => ({ dormitoryId })),
        },
      },
    });

    // BR-09 — publishing notifies every student the announcement targets.
    const targets =
      a.scope === "GLOBAL"
        ? [...studentsA, ...studentsB]
        : [...studentsA, ...studentsB].filter((s) =>
            a.dormitoryIds.includes(studentsA.some((x) => x.id === s.id) ? dormA.id : dormB.id),
          );

    await prisma.notification.createMany({
      data: targets.map((s) => ({
        userId: s.id,
        type: NotificationType.ANNOUNCEMENT_PUBLISHED,
        title: "Njoftim i ri",
        message: a.title,
        link: `/announcements/${created.id}`,
        isRead: a.daysAgo > 10,
        createdAt: publishedAt,
      })),
    });
  }
  console.log(`  ${announcements.length} announcements`);

  console.log("\nDone. Demo accounts (password for all: " + DEMO_PASSWORD + "):");
  console.log("  Administrator  1000000001  Arben Krasniqi   — Konvikti 1");
  console.log("  Administrator  1000000002  Teuta Berisha    — Konvikti 2");
  console.log("  Student        2000000001  Robert Morina    — Konvikti 1, dhoma A101");
  console.log("  Student        2000000002  Elira Gashi      — Konvikti 1, dhoma A102");
  console.log("  Student        2000000007  Endrit Zeqiri    — Konvikti 2, dhoma B101");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
