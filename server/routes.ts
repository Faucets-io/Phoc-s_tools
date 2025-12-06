import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  sendVerificationStart, 
  sendVerificationComplete, 
  sendVerificationStep,
  type FaceVerificationStep 
} from "./telegram";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Telegram notification endpoints
  
  // Start verification notification
  app.post("/api/verification/start", async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }
      
      await sendVerificationStart(username);
      res.json({ success: true, message: "Notification sent" });
    } catch (error) {
      console.error("Error sending start notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });
  
  // Step completion notification
  app.post("/api/verification/step", async (req, res) => {
    try {
      const { username, step } = req.body;
      
      if (!username || !step) {
        return res.status(400).json({ message: "Username and step are required" });
      }
      
      const stepData: FaceVerificationStep = {
        step: step.step || step,
        timestamp: new Date().toISOString(),
        success: step.success !== false,
        details: step.details
      };
      
      await sendVerificationStep(username, stepData);
      res.json({ success: true, message: "Step notification sent" });
    } catch (error) {
      console.error("Error sending step notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });
  
  // Complete verification notification
  app.post("/api/verification/complete", async (req, res) => {
    try {
      const { username, steps, success } = req.body;
      
      if (!username || !steps) {
        return res.status(400).json({ message: "Username and steps are required" });
      }
      
      await sendVerificationComplete(username, steps, success !== false);
      res.json({ success: true, message: "Completion notification sent" });
    } catch (error) {
      console.error("Error sending completion notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  return httpServer;
}
