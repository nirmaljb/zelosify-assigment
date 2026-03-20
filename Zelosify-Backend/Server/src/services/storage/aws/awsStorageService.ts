// awsStorageService.ts

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import * as dotenv from "dotenv";
import { StorageService } from "../storageService.js";

dotenv.config();

export class AwsStorageService extends StorageService {
  private s3Client: S3Client;
  private s3ClientForPresign: S3Client; // Separate client for presigning without checksums
  private bucket: string;

  constructor() {
    super();

    // Ensure required environment variables are present
    const region = process.env.S3_AWS_REGION;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const bucketName = process.env.S3_BUCKET_NAME;

    if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error("Missing required AWS S3 configuration");
    }

    // Main client for server-side operations
    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      endpoint: `https://s3.${region}.amazonaws.com`,
      forcePathStyle: true,
    });

    // Separate client for presigning - configured to not add checksums
    // requestChecksumCalculation: "WHEN_REQUIRED" prevents automatic checksum addition
    this.s3ClientForPresign = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Use virtual-hosted style for better compatibility with browser uploads
      forcePathStyle: false,
      // Disable automatic checksum calculation for presigned URLs
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });

    this.bucket = bucketName;

    // Log configuration (without sensitive data)
    console.log("[AWS S3] Initialized with:", {
      region,
      bucket: bucketName,
      endpoint: `https://s3.${region}.amazonaws.com`,
      hasCredentials: !!accessKeyId && !!secretAccessKey,
    });
  }

  async getObjectURL(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      return await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600,
        signableHeaders: new Set(["host"]),
      });
    } catch (error) {
      console.error("[AWS S3] Error generating get URL:", error);
      throw error;
    }
  }

  async getObjectStream(key: string): Promise<Readable> {
    try {
      console.log("[AWS S3] Getting object stream for:", {
        bucket: this.bucket,
        key,
      });

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error("No body returned from S3 object");
      }

      // AWS SDK v3 returns a ReadableStream, convert to Node.js Readable if needed
      const body = response.Body;
      if (body instanceof Readable) {
        return body;
      } else {
        // Handle other stream types (like ReadableStream from web streams)
        return Readable.fromWeb(body as any);
      }
    } catch (error) {
      console.error("[AWS S3] Error getting object stream:", error);
      throw error;
    }
  }

  async putObject(
    key: string,
    file: Buffer | Uint8Array | Blob | string,
    contentType = "application/pdf"
  ): Promise<{ message: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
      });
      await this.s3Client.send(command);
      return { message: "File uploaded successfully" };
    } catch (error) {
      console.error("[AWS S3] Error uploading file:", error);
      throw error;
    }
  }

  async listObjects(prefix: string): Promise<any[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });
      const response = await this.s3Client.send(command);
      return response.Contents || [];
    } catch (error) {
      console.error("[AWS S3] Error listing objects:", error);
      throw error;
    }
  }

  async getUploadURL(key: string, contentType = "application/pdf"): Promise<string> {
    try {
      console.log("[AWS S3] Generating upload URL for:", {
        bucket: this.bucket,
        key,
        contentType,
        region: process.env.S3_AWS_REGION,
      });

      // Create command without checksum - browser uploads can't compute checksums easily
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });

      // Use the presign client (no checksums) and minimal signed headers
      const url = await getSignedUrl(this.s3ClientForPresign, command, {
        expiresIn: 3600,
        // Only sign host header - content-type will be validated by S3 based on the command
        signableHeaders: new Set(["host"]),
      });

      console.log("[AWS S3] Generated upload URL successfully");
      return url;
    } catch (error) {
      console.error("[AWS S3] Error generating upload URL:", error);
      throw error;
    }
  }
}
