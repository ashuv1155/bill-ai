import { db, storage, isFirebaseConfigured } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { ExtractedBillData } from "@/lib/gemini";

export interface Bill extends ExtractedBillData {
  id: string;
  userId: string;
  fileUrl: string;
  fileName: string;
  createdAt: any;
  updatedAt: any;
}

const COLLECTION_NAME = "bills";

// Helper for generating standard mock bills
const MOCK_BILLS_KEY = "demo_bills";

function getMockBills(userId: string): Bill[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(MOCK_BILLS_KEY);
  if (!stored) {
    // Populate with some rich initial mock data
    const initialMock: Bill[] = [
      {
        id: "mock-1",
        userId,
        vendorName: "Amazon Web Services",
        billNumber: "INV-982312",
        date: "2026-06-10",
        gstin: "27AADCA8981A1Z2",
        subtotal: 8000,
        gstAmount: 1440,
        cgst: 720,
        sgst: 720,
        igst: 0,
        totalAmount: 9440,
        category: "Software",
        lineItems: [
          { description: "EC2 Instance Hosting", amount: 6000, qty: 1 },
          { description: "S3 Standard Storage", amount: 2000, qty: 1 },
        ],
        fileUrl: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&auto=format&fit=crop&q=60",
        fileName: "aws_june_invoice.pdf",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mock-2",
        userId,
        vendorName: "Starbucks Coffee",
        billNumber: "TX-4402",
        date: "2026-06-15",
        gstin: "",
        subtotal: 450,
        gstAmount: 22.5,
        cgst: 11.25,
        sgst: 11.25,
        igst: 0,
        totalAmount: 472.5,
        category: "Food",
        lineItems: [
          { description: "Caramel Macchiato", amount: 250, qty: 1 },
          { description: "Chocolate Croissant", amount: 200, qty: 1 },
        ],
        fileUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=60",
        fileName: "starbucks_receipt.png",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "mock-3",
        userId,
        vendorName: "Uber Rides",
        billNumber: "UB-88123-X",
        date: "2026-06-20",
        gstin: "07AAACU1234F1Z8",
        subtotal: 1200,
        gstAmount: 60,
        cgst: 30,
        sgst: 30,
        igst: 0,
        totalAmount: 1260,
        category: "Travel",
        lineItems: [
          { description: "Trip from Airport to Office", amount: 1200, qty: 1 },
        ],
        fileUrl: "https://images.unsplash.com/photo-1619252584172-a83a949b6efd?w=500&auto=format&fit=crop&q=60",
        fileName: "uber_ride_bill.png",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem(MOCK_BILLS_KEY, JSON.stringify(initialMock));
    return initialMock;
  }
  return JSON.parse(stored).filter((b: Bill) => b.userId === userId);
}

function saveMockBills(bills: Bill[]) {
  localStorage.setItem(MOCK_BILLS_KEY, JSON.stringify(bills));
}

export async function fetchBills(userId: string): Promise<Bill[]> {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId),
      orderBy("date", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
      } as Bill;
    });
  } else {
    // Return sorted by date desc
    return getMockBills(userId).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
}

// Global cache flag to bypass Firebase Storage if it's unprovisioned/disabled on the project
let isStorageDisabledGlobally = false;

export async function createBill(
  userId: string,
  file: File | null,
  extractedData: ExtractedBillData
): Promise<Bill> {
  let fileUrl = "";
  let fileName = "manually_entered";

  if (file) {
    fileName = file.name;
    if (isFirebaseConfigured && storage && !isStorageDisabledGlobally) {
      try {
        const storageRef = ref(
          storage,
          `users/${userId}/bills/${Date.now()}_${file.name}`
        );
        const snapshot = await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(snapshot.ref);
      } catch (err) {
        console.warn(
          "Firebase Storage upload failed (disabled on Spark plan). Bypassing storage globally and falling back to local Object URL.",
          err
        );
        isStorageDisabledGlobally = true; // Remember failure to save time next time
        fileUrl = URL.createObjectURL(file);
      }
    } else {
      // Demo fallback: create a local object URL to represent file
      fileUrl = URL.createObjectURL(file);
    }
  } else {
    fileUrl = "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=500&auto=format&fit=crop&q=60";
  }

  const newBillData = {
    userId,
    ...extractedData,
    fileUrl,
    fileName,
  };

  if (isFirebaseConfigured && db) {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...newBillData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return {
      id: docRef.id,
      ...newBillData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } else {
    // Save to local storage
    const bills = getMockBills(userId);
    const newBill: Bill = {
      id: "mock-" + Math.random().toString(36).substr(2, 9),
      ...newBillData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    bills.push(newBill);
    saveMockBills(bills);
    return newBill;
  }
}

export async function updateBill(
  billId: string,
  updatedFields: Partial<Bill>
): Promise<void> {
  if (isFirebaseConfigured && db) {
    const docRef = doc(db, COLLECTION_NAME, billId);
    await updateDoc(docRef, {
      ...updatedFields,
      updatedAt: Timestamp.now(),
    });
  } else {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(MOCK_BILLS_KEY);
      if (stored) {
        let bills: Bill[] = JSON.parse(stored);
        bills = bills.map((b) =>
          b.id === billId
            ? { ...b, ...updatedFields, updatedAt: new Date().toISOString() }
            : b
        );
        saveMockBills(bills);
      }
    }
  }
}

export async function deleteBill(
  billId: string,
  userId: string,
  fileName?: string
): Promise<void> {
  if (isFirebaseConfigured && db) {
    const docRef = doc(db, COLLECTION_NAME, billId);
    await deleteDoc(docRef);

    // Also delete storage file if it exists
    if (fileName && storage) {
      try {
        const storageRef = ref(storage, `users/${userId}/bills/${fileName}`);
        await deleteObject(storageRef);
      } catch (err) {
        console.warn("Storage deletion warning (might not exist):", err);
      }
    }
  }
}

export async function checkForDuplicateBill(
  userId: string,
  billNumber: string,
  vendorName: string,
  totalAmount: number,
  date: string,
  excludeBillId?: string
): Promise<Bill | null> {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Bill[];

    const match = list.find((b) => {
      if (b.id === excludeBillId) return false;
      if (
        billNumber &&
        b.billNumber &&
        b.billNumber.trim().toLowerCase() === billNumber.trim().toLowerCase()
      ) {
        return true;
      }
      if (
        b.vendorName.trim().toLowerCase() === vendorName.trim().toLowerCase() &&
        b.totalAmount === totalAmount &&
        b.date === date
      ) {
        return true;
      }
      return false;
    });

    return match || null;
  } else {
    const bills = getMockBills(userId);
    const match = bills.find((b) => {
      if (b.id === excludeBillId) return false;
      if (
        billNumber &&
        b.billNumber &&
        b.billNumber.trim().toLowerCase() === billNumber.trim().toLowerCase()
      ) {
        return true;
      }
      if (
        b.vendorName.trim().toLowerCase() === vendorName.trim().toLowerCase() &&
        b.totalAmount === totalAmount &&
        b.date === date
      ) {
        return true;
      }
      return false;
    });
    return match || null;
  }
}

