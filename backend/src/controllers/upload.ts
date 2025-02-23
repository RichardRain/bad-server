import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import BadRequestError from '../errors/bad-request-error'
import { types } from '../middlewares/file'
import fs from 'fs/promises'
import sharp from 'sharp'
import { loadEsm } from 'load-esm'

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.file) {
        return next(new BadRequestError('Файл не загружен'))
    }

    const filePath = req.file.path
    let file: Buffer

    try {
        const { fileTypeFromBuffer } = await loadEsm<typeof import('file-type')>('file-type')

        file = await fs.readFile(filePath)

        const type = await fileTypeFromBuffer(file)
        if (!type) {
            throw new BadRequestError('Тип файла не определен')
        }
        if (!types.includes(type.mime)) {
            throw new BadRequestError('Неверный формат файла')
        }

        if (req.file.size < 2048) {
            throw new BadRequestError('Файл слишком маленький')
        }
        if (req.file.size > 10485760) {
            throw new BadRequestError('Файл слишком большой')
        }

        const metadata = await sharp(file).metadata()
        if (!metadata.width || !metadata.height) {
            throw new BadRequestError('Неверный формат файла')
        }

        const fileName = process.env.UPLOAD_PATH
            ? `/${process.env.UPLOAD_PATH}/${req.file.filename}`
            : `/${req.file.filename}`

        res.status(constants.HTTP_STATUS_CREATED).json({
            fileName,
            originalName: req.file.originalname,
        })
    } catch (error) {
        await fs.unlink(filePath).catch(() => {})

        if (error instanceof BadRequestError) {
            return next(error)
        }

        return next(new BadRequestError('Неверный формат файла'))
    }
}

export default {}
