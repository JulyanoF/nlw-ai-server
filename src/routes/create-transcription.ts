import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { z } from 'zod'
import { createReadStream } from "fs";
import { openai } from "../lib/openai";


export async function createTranscriptionRoute(app: FastifyInstance) {
  app.post('/videos/:id/transcription', async (req, res) => {
    const paramsSchema = z.object({
      id: z.string().uuid()
    })

    const { id } = paramsSchema.parse(req.params)

    const bodySchema = z.object({
      prompt: z.string()
    })

    const { prompt } = bodySchema.parse(req.body)

    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: id
      }
    })

    const videoPath = video.path
    const audioReadStrem = createReadStream(videoPath)

    const response = await openai.audio.transcriptions.create({
      file: audioReadStrem,
      model: 'whisper-1',
      language: 'pt',
      response_format: 'json',
      temperature: 0,
      prompt
    })

    const transcription = response.text

    await prisma.video.update({
      where: {
        id
      },
      data: {
        transcription: transcription
      }
    })
    return { transcription }
  })
}