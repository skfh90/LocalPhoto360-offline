import RNFS from "react-native-fs";

export const PHOTO_ROOT = `${RNFS.DocumentDirectoryPath}/photo`;

export const getDirectoryPath = () => PHOTO_ROOT;

export const createDirectoryIfNotExists = async (
  directoryPath: string,
): Promise<void> => {
  const exists = await RNFS.exists(directoryPath);
  if (!exists) {
    await RNFS.mkdir(directoryPath);
  }
};

export const deleteFilesInDirectory = async (
  directoryPath: string,
): Promise<void> => {
  const exists = await RNFS.exists(directoryPath);
  if (!exists) return;
  const files = await RNFS.readDir(directoryPath);
  await Promise.all(files.map((file) => RNFS.unlink(file.path)));
};

export const copyFile = async (
  sourcePath: string,
  destinationPath: string,
): Promise<void> => {
  const destinationExists = await RNFS.exists(destinationPath);
  if (destinationExists) {
    await RNFS.unlink(destinationPath);
  }
  await RNFS.copyFile(sourcePath, destinationPath);
};

export const existFileInDirectory = async (
  directoryPath: string,
  fileName: string,
): Promise<boolean> => {
  return RNFS.exists(`${directoryPath}/${fileName}`);
};

export const listCaptureImages = async (folder: string): Promise<string[]> => {
  const dir = `${PHOTO_ROOT}/${folder}`;
  const exists = await RNFS.exists(dir);
  if (!exists) return [];
  const files = await RNFS.readDir(dir);
  return files
    .filter((f) => f.name.startsWith("img_") && f.name.endsWith(".jpeg"))
    .map((f) => f.path)
    .sort();
};

export const getPanoramaPath = (folder: string, fileName: string) =>
  `file://${PHOTO_ROOT}/${folder}/${fileName}`;

export const getPanoramaFilePath = (folder: string, fileName: string) =>
  `${PHOTO_ROOT}/${folder}/${fileName}`;

export const getThumbnailUri = (folder: string) =>
  `file://${PHOTO_ROOT}/${folder}/thumbnail.jpg`;

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
