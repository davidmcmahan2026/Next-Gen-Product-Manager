// Augments Express's Request with the `actor` field requireFrontendSession
// attaches, so routes can read req.actor without a manual cast everywhere.
import "express";

declare global {
  namespace Express {
    interface Request {
      actor?: string;
    }
  }
}

export {};
