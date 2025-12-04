import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to check if the current user has adult access based on their birthdate
 * Returns isAdult (true if 18+), isLoading, and the user's age
 */
export const useAdultAccess = () => {
  const { user } = useAuth();
  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasBirthdate, setHasBirthdate] = useState(false);

  useEffect(() => {
    const checkAdultAccess = async () => {
      if (!user) {
        setIsAdult(null);
        setAge(null);
        setHasBirthdate(false);
        setIsLoading(false);
        return;
      }

      try {
        // First check using the database function
        const { data: isAdultData, error: funcError } = await supabase
          .rpc("is_user_adult", { _user_id: user.id });

        if (!funcError && isAdultData !== null) {
          setIsAdult(isAdultData);
        }

        // Also get the actual birthdate for more details
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("birthdate")
          .eq("user_id", user.id)
          .single();

        if (!profileError && profile) {
          setHasBirthdate(!!profile.birthdate);
          
          if (profile.birthdate) {
            const birthDate = new Date(profile.birthdate);
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              calculatedAge--;
            }
            
            setAge(calculatedAge);
            setIsAdult(calculatedAge >= 18);
          }
        }
      } catch (error) {
        console.error("Error checking adult access:", error);
        setIsAdult(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdultAccess();
  }, [user]);

  return { isAdult, age, isLoading, hasBirthdate };
};

export default useAdultAccess;
