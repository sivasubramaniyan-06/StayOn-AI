export const env = {
  awsRegion: process.env.AWS_REGION || "ap-south-1",
  documentsBucket: process.env.DOCUMENTS_BUCKET || "",
  tableName: process.env.TABLE_NAME || "",
};
