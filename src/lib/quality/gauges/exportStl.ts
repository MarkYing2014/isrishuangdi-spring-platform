import { Mesh } from "./geometryBuilders";

/**
 * STL Exporter (Binary Format)
 * Q1: Smart Gauge Generator
 */

export function exportMeshToBinaryStl(mesh: Mesh): ArrayBuffer {
    const { vertices, faces } = mesh;
    const faceCount = faces.length;

    // Header (80 bytes) + FaceCount (4 bytes) + Faces (faceCount * 50 bytes)
    const bufferSize = 84 + (faceCount * 50);
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // 1. Write Header (80 bytes)
    const header = "SEOS Smart Gauge Generator - Binary STL";
    for (let i = 0; i < header.length; i++) {
        view.setUint8(i, header.charCodeAt(i));
    }

    // 2. Write Face Count (4 bytes, little endian)
    view.setUint32(80, faceCount, true);

    // 3. Write Faces (50 bytes each)
    let offset = 84;
    for (const face of faces) {
        // Normal (3 * 4 bytes) - Set to zero or calculate (STL doesn't strictly need it if vertices are ordered)
        view.setFloat32(offset, 0, true);
        view.setFloat32(offset + 4, 0, true);
        view.setFloat32(offset + 8, 0, true);
        offset += 12;

        // Vertices (3 * 3 * 4 bytes)
        for (const vertIdx of face) {
            const vert = vertices[vertIdx];
            view.setFloat32(offset, vert[0], true);
            view.setFloat32(offset + 4, vert[1], true);
            view.setFloat32(offset + 8, vert[2], true);
            offset += 12;
        }

        // Attribute Byte Count (2 bytes)
        view.setUint16(offset, 0, true);
        offset += 2;
    }

    return buffer;
}

/**
 * Trigger download of binary STL
 */
export function downloadStl(buffer: ArrayBuffer, filename: string) {
    const blob = new Blob([buffer], { type: "application/sla" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}
