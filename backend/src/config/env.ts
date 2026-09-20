function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  awsRegion: process.env.AWS_REGION || "ap-south-1",
  documentsBucket: process.env.DOCUMENTS_BUCKET || "",
  tableName: process.env.TABLE_NAME || "stayon-app-data",
};