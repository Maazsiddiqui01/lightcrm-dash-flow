import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function SetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyAndSetEmail = async () => {
      try {
        // Parse hash parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const token = hashParams.get('token');
        const type = hashParams.get('type');
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        // Handle errors in the URL
        if (error) {
          toast({
            title: "Invalid or Expired Link",
            description: errorDescription || "The invitation link is invalid or has expired. Please request a new invitation.",
            variant: "destructive",
          });
          setIsVerifying(false);
          return;
        }

        // Handle modern flow: access_token + refresh_token in hash
        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) throw sessionError;

          const userEmail = sessionData.session?.user?.email;
          if (userEmail) {
            setEmail(userEmail);
            // Clear the hash
            window.history.replaceState(null, '', window.location.pathname);
          } else {
            throw new Error("Unable to retrieve email from session");
          }
          
          setIsVerifying(false);
          return;
        }

        // Handle legacy flow: token + type=invite in hash
        if (token && type === 'invite') {
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'invite',
          });

          if (verifyError) throw verifyError;

          // Get the session after verification
          const { data: sessionData } = await supabase.auth.getSession();
          const userEmail = data.user?.email || sessionData?.session?.user?.email;

          if (userEmail) {
            setEmail(userEmail);
            // Clear the hash
            window.history.replaceState(null, '', window.location.pathname);
          } else {
            throw new Error("Unable to retrieve email from invitation");
          }
          
          setIsVerifying(false);
          return;
        }

        // If no valid tokens found, check if there's already a session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user?.email) {
          setEmail(sessionData.session.user.email);
          setIsVerifying(false);
          return;
        }

        // No valid authentication found
        toast({
          title: "Invalid Link",
          description: "This link is not valid. Please use the invitation link from your email.",
          variant: "destructive",
        });
        setIsVerifying(false);

      } catch (error: any) {
        console.error("Error verifying invite:", error);
        toast({
          title: "Verification Failed",
          description: error.message || "Failed to verify invitation. Please request a new invitation.",
          variant: "destructive",
        });
        setIsVerifying(false);
      }
    };

    verifyAndSetEmail();
  }, [toast]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "Password Set Successfully",
        description: "Your account is now active. Redirecting to dashboard...",
      });

      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error: any) {
      console.error("Error setting password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to set password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Verifying invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Your Password</CardTitle>
          <CardDescription>
            Welcome! Create a password to complete your account setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={6}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting Password...
                </>
              ) : (
                "Set Password & Continue"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
