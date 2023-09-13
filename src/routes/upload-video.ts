import { FastifyInstance } from "fastify";
import { fastifyMultipart } from '@fastify/multipart'
import { prisma } from "../lib/prisma";
import path from "path";
import { randomUUID } from "crypto";
import { pipeline } from "stream";
import { promisify } from "util";
import fs from 'fs';

const pump = promisify(pipeline)

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25 // 25mb
    }
  })
  app.post('/videos', async (req, res) => {
    const data = await req.file()

    if (!data) {
      return res.status(400).send({ error: 'Missing file input' })
    }

    const extension = path.extname(data.filename)

    if (extension !== '.mp3') {
      return res.status(400).send({ error: 'Invalid input type. Only MP3 is allowed!' })
    }

    const fileBaseName = path.basename(data.filename, extension)
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`

    const uploadDestination = path.resolve(__dirname, '../../tmp', fileUploadName)

    await pump(data.file, fs.createWriteStream(uploadDestination))

    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDestination
      }
    })

    return res.status(200).send({
      video
    })
  })
}