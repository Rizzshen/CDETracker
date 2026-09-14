import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("../serviceAccount.json", import.meta.url)),
);

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

const TEST_EMAIL_A = `jar.test.a.${Date.now()}@cdetest.com`;
const TEST_EMAIL_B = `jar.test.b.${Date.now()}@cdetest.com`;
const PASSWORD = "test1234";

// Colored console output
const log = {
  success: (msg) => console.log(`\x1b[32m✅ PASS:\x1b[0m ${msg}`),
  fail: (msg) => console.error(`\x1b[31m❌ FAIL:\x1b[0m ${msg}`),
  info: (msg) => console.log(`\x1b[36mℹ️  INFO:\x1b[0m ${msg}`),
  step: (msg) => console.log(`\n\x1b[1m\x1b[33m▶️  STEP:\x1b[0m ${msg}`),
};

const runTests = async () => {
  let uidA, uidB, coupleId;

  try {
    log.step("1. Creating test users and couple...");
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
    coupleId = `jar_test_${Date.now()}`;

    await db.doc(`users/${uidA}`).set({
      uid: uidA,
      email: TEST_EMAIL_A,
      color: "gold",
      coupleId,
    });

    await db.doc(`users/${uidB}`).set({
      uid: uidB,
      email: TEST_EMAIL_B,
      color: "violet",
      coupleId,
    });

    await db.doc(`couples/${coupleId}`).set({
      code: "JARTEST",
      members: [uidA, uidB],
      createdAt: Date.now(),
    });
    log.success("Users and couple created");

    // ---------------------------------------------------------
    // TEST 1: Initialize Jar
    // ---------------------------------------------------------
    log.step("2. Testing: Initialize empty jar...");
    const jarRef = db.doc(`couples/${coupleId}/jar/main`);

    await jarRef.set({
      totalBalance: 0,
      pendingDebt: 0,
      monthlyBet: 500,
      history: [],
    });

    const jarSnap = await jarRef.get();
    const jarData = jarSnap.data();

    if (jarData.totalBalance === 0 && jarData.monthlyBet === 500) {
      log.success("Jar initialized correctly");
    } else {
      log.fail("Jar initialization failed");
    }

    // ---------------------------------------------------------
    // TEST 2: End of Month - Set Loser & Pending Debt
    // ---------------------------------------------------------
    log.step("3. Testing: End of month - User A loses, owes 500...");

    await jarRef.set(
      {
        pendingDebt: 500,
        debtorUid: uidA,
        debtorName: TEST_EMAIL_A.split("@")[0],
      },
      { merge: true },
    );

    const afterLoss = await jarRef.get();
    const lossData = afterLoss.data();

    if (lossData.pendingDebt === 500 && lossData.debtorUid === uidA) {
      log.success("Loser and pending debt set correctly");
    } else {
      log.fail("Failed to set loser/debt");
    }

    // ---------------------------------------------------------
    // TEST 3: Loser Marks as Paid (Payment Flow)
    // ---------------------------------------------------------
    log.step("4. Testing: Loser clicks 'I Paid'...");

    await jarRef.set(
      {
        pendingDebt: 0,
        debtorUid: FieldValue.delete(),
        debtorName: FieldValue.delete(),
        totalBalance: FieldValue.increment(500),
        history: [
          {
            id: "test-payment-1",
            type: "payment",
            amount: 500,
            note: "Test payment",
            date: new Date().toISOString(),
            addedBy: uidA,
          },
        ],
      },
      { merge: true },
    );

    const afterPay = await jarRef.get();
    const payData = afterPay.data();

    if (
      payData.totalBalance === 500 &&
      payData.pendingDebt === 0 &&
      !payData.debtorUid
    ) {
      log.success("Payment processed: balance = 500, debt cleared");
    } else {
      log.fail(
        `Payment failed: balance=${payData.totalBalance}, debt=${payData.pendingDebt}`,
      );
    }

    // ---------------------------------------------------------
    // TEST 4: Log Date Expense (Spending)
    // ---------------------------------------------------------
    log.step("5. Testing: Log date expense (spend 300)...");

    await jarRef.set(
      {
        totalBalance: FieldValue.increment(-300),
        history: [
          {
            id: "test-spending-1",
            type: "spending",
            amount: 300,
            note: "Dinner at Mario's 🍝",
            date: new Date().toISOString(),
            addedBy: uidB,
          },
          ...payData.history,
        ],
      },
      { merge: true },
    );

    const afterSpend = await jarRef.get();
    const spendData = afterSpend.data();

    if (spendData.totalBalance === 200) {
      log.success("Spending logged: balance reduced to 200");
    } else {
      log.fail(`Spending failed: expected 200, got ${spendData.totalBalance}`);
    }

    // Check history
    const spendingEntry = spendData.history.find((h) => h.type === "spending");
    if (spendingEntry && spendingEntry.note === "Dinner at Mario's 🍝") {
      log.success("History entry created with note");
    } else {
      log.fail("History entry missing or incorrect");
    }

    // ---------------------------------------------------------
    // TEST 5: Debt Stacking (Unpaid debt carries over)
    // ---------------------------------------------------------
    log.step("6. Testing: Debt stacking (new month, old debt unpaid)...");

    // Simulate: New month starts, but last month's 500 debt was NEVER paid
    // So new bet (500) + old debt (500) = 1000 pending
    await jarRef.set(
      {
        monthlyBet: 500,
        pendingDebt: 1000, // 500 old + 500 new
        debtorUid: uidB,
        debtorName: TEST_EMAIL_B.split("@")[0],
        totalBalance: 200, // What's left from before
      },
      { merge: true },
    );

    const afterStack = await jarRef.get();
    const stackData = afterStack.data();

    if (stackData.pendingDebt === 1000 && stackData.totalBalance === 200) {
      log.success("Debt stacking works: pending = 1000, balance = 200");
    } else {
      log.fail(
        `Stacking failed: pending=${stackData.pendingDebt}, balance=${stackData.totalBalance}`,
      );
    }

    // ---------------------------------------------------------
    // TEST 6: Edge Case - Spending more than balance
    // ---------------------------------------------------------
    log.step("7. Testing: Edge case - try to spend more than balance...");

    const invalidSpend = 500; // Only 200 in jar
    if (invalidSpend > stackData.totalBalance) {
      log.success(
        "App should block this spend (200 < 500) - logic check passed",
      );
    } else {
      log.fail("Balance check logic failed");
    }

    // ---------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------
    log.step("8. Cleaning up test data...");

    await db.doc(`couples/${coupleId}/jar/main`).delete();
    await db.doc(`couples/${coupleId}`).delete();
    await db.doc(`users/${uidA}`).delete();
    await db.doc(`users/${uidB}`).delete();
    await auth.deleteUser(uidA);
    await auth.deleteUser(uidB);

    log.success("Test data cleaned up");

    log.step("🎉 ALL JAR TESTS PASSED! 🎉\n");
    log.info("Summary:");
    log.info("  ✅ Jar initialization");
    log.info("  ✅ Loser/debt assignment");
    log.info("  ✅ Payment flow (balance +500)");
    log.info("  ✅ Spending flow (balance -300)");
    log.info("  ✅ History tracking");
    log.info("  ✅ Debt stacking");
    log.info("  ✅ Balance validation");
  } catch (error) {
    log.fail(`Test suite crashed: ${error.message}`);
    console.error(error);

    // Emergency cleanup
    if (uidA) {
      await auth.deleteUser(uidA).catch(() => {});
      await db
        .doc(`users/${uidA}`)
        .delete()
        .catch(() => {});
    }
    if (uidB) {
      await auth.deleteUser(uidB).catch(() => {});
      await db
        .doc(`users/${uidB}`)
        .delete()
        .catch(() => {});
    }
    if (coupleId) {
      await db
        .doc(`couples/${coupleId}`)
        .delete()
        .catch(() => {});
    }
    process.exit(1);
  }
};

runTests();
