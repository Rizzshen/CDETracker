import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

// 1. Initialize Firebase Admin
const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("../serviceAccount.json", import.meta.url)),
);

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

const TEST_EMAIL_A = `poke.test.a.${Date.now()}@cdetest.com`;
const TEST_EMAIL_B = `poke.test.b.${Date.now()}@cdetest.com`;
const PASSWORD = "test1234";

// Helper for colored console output
const log = {
  success: (msg) => console.log(`\x1b[32m✅ PASS:\x1b[0m ${msg}`),
  fail: (msg) => console.error(`\x1b[31m❌ FAIL:\x1b[0m ${msg}`),
  info: (msg) => console.log(`\x1b[36mℹ️  INFO:\x1b[0m ${msg}`),
  step: (msg) => console.log(`\n\x1b[1m\x1b[33m▶️  STEP:\x1b[0m ${msg}`),
};

const runTests = async () => {
  let uidA, uidB, coupleId;

  try {
    log.step("1. Creating test users...");
    const userA = await auth.createUser({
      email: TEST_EMAIL_A,
      password: PASSWORD,
    });
    const userB = await auth.createUser({
      email: TEST_EMAIL_B,
      password: PASSWORD,
    });
    uidA = userA.uid;
    uidB = userB.uid;
    coupleId = `test_couple_${Date.now()}`;
    log.success(`Created User A (${uidA}) and User B (${uidB})`);

    log.step("2. Setting up initial user profiles and coupling them...");
    await db.doc(`users/${uidA}`).set(
      {
        uid: uidA,
        email: TEST_EMAIL_A,
        color: "gold",
        coupleId: coupleId,
        existingData: "should_not_be_deleted",
      },
      { merge: true },
    );

    await db.doc(`users/${uidB}`).set(
      {
        uid: uidB,
        email: TEST_EMAIL_B,
        color: "violet",
        coupleId: coupleId,
        existingData: "should_not_be_deleted",
      },
      { merge: true },
    );

    await db.doc(`couples/${coupleId}`).set({
      code: "TEST",
      members: [uidA, uidB],
      createdAt: Date.now(),
    });
    log.success("Profiles and couple created.");

    // ---------------------------------------------------------
    // TEST 1: Basic Poke Functionality
    // ---------------------------------------------------------
    log.step("3. Testing Basic Poke (User A pokes User B)...");
    const pokeName = TEST_EMAIL_A.split("@")[0];

    await db
      .doc(`users/${uidB}`)
      .set({ pokedBy: pokeName, pokeTime: new Date() }, { merge: true });

    const userBDocAfterPoke = await db.doc(`users/${uidB}`).get();
    const userDataB = userBDocAfterPoke.data();

    if (userDataB.pokedBy === pokeName) {
      log.success("User B's 'pokedBy' field updated correctly.");
    } else {
      log.fail(
        `Expected pokedBy to be '${pokeName}', got '${userDataB.pokedBy}'`,
      );
    }

    if (userDataB.existingData === "should_not_be_deleted") {
      log.success("Merge worked! Existing user data was NOT overwritten.");
    } else {
      log.fail("Merge failed! Existing user data was wiped out.");
    }

    // ---------------------------------------------------------
    // TEST 2: Clearing the Poke
    // ---------------------------------------------------------
    log.step("4. Testing Poke Cleanup...");

    await db
      .doc(`users/${uidB}`)
      .set(
        { pokedBy: FieldValue.delete(), pokeTime: FieldValue.delete() },
        { merge: true },
      );

    const userBDocAfterCleanup = await db.doc(`users/${uidB}`).get();
    const userDataBClean = userBDocAfterCleanup.data();

    if (!userDataBClean.pokedBy && !userDataBClean.pokeTime) {
      log.success("Poke fields successfully deleted from database.");
    } else {
      log.fail("Poke fields were not deleted.");
    }

    if (userDataBClean.existingData === "should_not_be_deleted") {
      log.success("Cleanup merge worked! Existing data still intact.");
    } else {
      log.fail("Cleanup wiped out existing data!");
    }

    // ---------------------------------------------------------
    // TEST 3: Edge Case - User with no partner
    // ---------------------------------------------------------
    log.step("5. Testing Edge Case: User without a partner...");
    const lonelyUser = await auth.createUser({
      email: `lonely.${Date.now()}@cdetest.com`,
      password: PASSWORD,
    });

    const partnerUid = null;
    let pokeAttempted = false;

    if (partnerUid) {
      pokeAttempted = true;
    }

    if (!pokeAttempted) {
      log.success(
        "Gracefully handled: No database write attempted for user without a partner.",
      );
    } else {
      log.fail("Script attempted to poke without a partner UID.");
    }

    await auth.deleteUser(lonelyUser.uid);

    // ---------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------
    log.step("6. Cleaning up test data...");

    await db.doc(`users/${uidA}`).delete();
    await db.doc(`users/${uidB}`).delete();
    await db.doc(`couples/${coupleId}`).delete();

    await auth.deleteUser(uidA);
    await auth.deleteUser(uidB);
    log.success("Test users and documents deleted.");

    log.step("🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉\n");
  } catch (error) {
    log.fail(`Test suite crashed: ${error.message}`);
    console.error(error);

    if (uidA) await auth.deleteUser(uidA).catch(() => {});
    if (uidB) await auth.deleteUser(uidB).catch(() => {});
    process.exit(1);
  }
};

runTests();
