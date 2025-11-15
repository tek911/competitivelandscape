import multer from 'multer';
import path from 'path';
import { BadRequestError } from '../utils/errors';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default

const storage = multer.memoryStorage();

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'application/vnd.oasis.opendocument.spreadsheet',
  ];

  const allowedExtensions = ['.xlsx', '.xls', '.csv', '.ods'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new BadRequestError('Invalid file type. Only Excel and CSV files are allowed.'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 10);

export const validateFileUpload = (req: Express.Request, _res: any, next: any) => {
  if (!req.file && !req.files) {
    throw new BadRequestError('No file uploaded');
  }
  next();
};
