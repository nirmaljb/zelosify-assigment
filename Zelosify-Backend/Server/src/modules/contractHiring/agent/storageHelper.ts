/**
 * Storage Helper for Agent
 * 
 * Provides file retrieval functionality for the agent to access resume files from S3.
 * Wraps the vendor storage adapter for agent-specific use.
 */

import { getFileStream } from "../vendor/storageAdapter.js";

/**
 * Get file contents as a Buffer from S3
 * Used by the agent to retrieve resume files for parsing
 */
export async function getFileBuffer(s3Key: string): Promise<Buffer> {
  const stream = await getFileStream(s3Key);
  
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    
    stream.on("error", (error) => {
      reject(new Error(`Failed to retrieve file from S3: ${error.message}`));
    });
  });
}
