/**
 * PPAP Repository
 * In-memory storage for demo (Prisma-ready interface)
 * 
 * TODO: Replace with Prisma when database is configured
 */

import type {
    PpapPackage,
    PpapPackageCreateInput,
    PswDocument,
    PpapChecklistItem,
    PpapChecklistKey,
} from "./types";
import { createDefaultChecklist } from "./checklist";

// ============ In-Memory Storage ============
const ppapPackages: Map<string, PpapPackage> = new Map();
const pswDocuments: Map<string, PswDocument> = new Map();
let packageCounter = 1;
let pswCounter = 1;

// ============ ID Generation ============
function generatePpapId(): string {
    const year = new Date().getFullYear();
    const num = String(packageCounter++).padStart(6, "0");
    return `PPAP-${year}-${num}`;
}

function generatePswId(): string {
    const year = new Date().getFullYear();
    const num = String(pswCounter++).padStart(6, "0");
    return `PSW-${year}-${num}`;
}

// ============ PPAP Package Repository ============
export const PpapRepository = {
    /**
     * Create a new PPAP package
     */
    async create(input: PpapPackageCreateInput): Promise<PpapPackage> {
        const now = new Date().toISOString();
        const ppap: PpapPackage = {
            id: generatePpapId(),
            partNo: input.partNo,
            partRev: input.partRev,
            partName: input.partName,
            program: input.program,
            customer: input.customer,
            submissionLevel: input.submissionLevel ?? 3,
            status: "DRAFT",
            checklist: createDefaultChecklist(),
            createdAt: now,
            updatedAt: now,
        };
        ppapPackages.set(ppap.id, ppap);
        return ppap;
    },

    /**
     * Get all PPAP packages
     */
    async findAll(): Promise<PpapPackage[]> {
        return Array.from(ppapPackages.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    },

    /**
     * Get a single PPAP package by ID
     */
    async findById(id: string): Promise<PpapPackage | null> {
        return ppapPackages.get(id) ?? null;
    },

    /**
     * Update a PPAP package
     */
    async update(id: string, updates: Partial<PpapPackage>): Promise<PpapPackage | null> {
        const existing = ppapPackages.get(id);
        if (!existing) return null;

        const updated: PpapPackage = {
            ...existing,
            ...updates,
            id: existing.id, // Prevent ID change
            createdAt: existing.createdAt, // Prevent createdAt change
            updatedAt: new Date().toISOString(),
        };
        ppapPackages.set(id, updated);
        return updated;
    },

    /**
     * Update a specific checklist item
     */
    async updateChecklistItem(
        ppapId: string,
        key: PpapChecklistKey,
        updates: Partial<PpapChecklistItem>
    ): Promise<PpapPackage | null> {
        const ppap = ppapPackages.get(ppapId);
        if (!ppap) return null;

        const newChecklist = ppap.checklist.map((item) =>
            item.key === key
                ? { ...item, ...updates, key: item.key, updatedAt: new Date().toISOString() }
                : item
        );

        return this.update(ppapId, { checklist: newChecklist });
    },

    /**
     * Link a reference to a checklist item
     */
    async linkReference(
        ppapId: string,
        key: PpapChecklistKey,
        sourceType: string,
        sourceId: string,
        sourceUrl?: string
    ): Promise<PpapPackage | null> {
        return this.updateChecklistItem(ppapId, key, {
            sourceType: sourceType as any,
            sourceId,
            sourceUrl,
            status: "READY",
        });
    },

    /**
     * Delete a PPAP package
     */
    async delete(id: string): Promise<boolean> {
        return ppapPackages.delete(id);
    },
};

// ============ PSW Document Repository ============
export const PswRepository = {
    /**
     * Create a new PSW document
     */
    async create(pswData: Omit<PswDocument, "id" | "generatedAt">): Promise<PswDocument> {
        const psw: PswDocument = {
            ...pswData,
            id: generatePswId(),
            generatedAt: new Date().toISOString(),
        };
        pswDocuments.set(psw.id, psw);
        return psw;
    },

    /**
     * Get a PSW document by ID
     */
    async findById(id: string): Promise<PswDocument | null> {
        return pswDocuments.get(id) ?? null;
    },

    /**
     * Get PSW document by PPAP ID
     */
    async findByPpapId(ppapId: string): Promise<PswDocument | null> {
        for (const psw of pswDocuments.values()) {
            if (psw.ppapId === ppapId) return psw;
        }
        return null;
    },

    /**
     * Update a PSW document
     */
    async update(id: string, updates: Partial<PswDocument>): Promise<PswDocument | null> {
        const existing = pswDocuments.get(id);
        if (!existing) return null;

        const updated: PswDocument = {
            ...existing,
            ...updates,
            id: existing.id,
            generatedAt: existing.generatedAt,
        };
        pswDocuments.set(id, updated);
        return updated;
    },
};

// ============ Seed Demo Data ============
export async function seedDemoData(): Promise<void> {
    // Only seed if no packages exist yet
    if (ppapPackages.size > 0) {
        return;
    }

    // Create a sample PPAP package for demo
    const demo = await PpapRepository.create({
        partNo: "SPR-2024-001",
        partRev: "A",
        partName: "Compression Spring Assembly",
        program: "EV Platform 2025",
        customer: "Tesla Motors",
        submissionLevel: 3,
    });

    // Mark some items as ready for demo
    await PpapRepository.updateChecklistItem(demo.id, "designRecord", {
        status: "READY",
        sourceType: "design",
        sourceId: "DES-001",
        sourceUrl: "/tools/calculator?id=DES-001",
    });

    await PpapRepository.updateChecklistItem(demo.id, "engineeringApproval", {
        status: "IN_PROGRESS",
        sourceType: "engineering",
        notes: "Pending final review",
    });
}

