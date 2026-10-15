import { defineServer, defineRoom } from 'colyseus';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { PlatformRoom } from './rooms/PlatformRoom.js';
import { LoungeRoom } from './rooms/LoungeRoom.js';
import { listAvailableGames } from './games/registry.js';

const server = defineServer({
  rooms: {
    lounge_room: defineRoom(LoungeRoom),
    platform_room: defineRoom(PlatformRoom),
  },
  express: (app) => {
    app.use(cors());

    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', serverTime: Date.now() });
    });

    app.get('/api/games', (req, res) => {
      res.json(listAvailableGames());
    });

    // Serve client static build in production if available
    const possibleDistPaths = [
      path.resolve(process.cwd(), 'apps/client/dist'),
      path.resolve(process.cwd(), '../client/dist'),
      path.resolve(new URL('.', import.meta.url).pathname, '../../client/dist'),
    ];
    const clientDist = possibleDistPaths.find((p) => fs.existsSync(p));

    if (clientDist) {
      app.use(express.static(clientDist));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/colyseus')) {
          return next();
        }
        res.sendFile(path.join(clientDist, 'index.html'));
      });
    }
  },
});

export default server;
