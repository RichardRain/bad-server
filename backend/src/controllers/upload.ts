import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import BadRequestError from '../errors/bad-request-error'
import { types } from '../middlewares/file'
import mime from 'mime'
import fs from 'fs'
import sharp from 'sharp'

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.file) {
        return next(new BadRequestError('Файл не загружен'))
    }
    const fileType = mime.lookup(req.file.path);
    
    if (!fileType) {
        return next(new BadRequestError('Тип файла не определен'))
    }

    if (!types.includes(fileType)) {
        return next(new BadRequestError('Неверный формат файла'))
    }

    const file = fs.readFileSync(req.file.path);
    const metadata = await sharp(file).metadata();
    
    if (!metadata.width || !metadata.height) {
        return next(new BadRequestError('Неверный формат файла'))
    }

    if (req.file.size < 2048) {
        return next(new BadRequestError('Файл слишком маленький'))
    }

    if (req.file.size > 10485760) {
        return next(new BadRequestError('Файл слишком большой'))
    }

    try {
        const fileName = process.env.UPLOAD_PATH
            ? `/${process.env.UPLOAD_PATH}/${req.file.filename}`
            : `/${req.file?.filename}`
        return res.status(constants.HTTP_STATUS_CREATED).send({
            fileName,
            originalName: req.file?.originalname,
        })
    } catch (error) {
        return next(error)
    }
}

export default {}
