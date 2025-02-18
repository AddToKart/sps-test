import { Document, Page, pdf as reactPdf } from '@react-pdf/renderer';

export const pdf = async (document: React.ReactElement<typeof Document>) => {
  return await reactPdf(document);
}; 