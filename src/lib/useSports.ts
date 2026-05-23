import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "./supabase";

export function useSports() {
  const [sports, setSports] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        const { data } = await supabase
          .from("sports")
          .select("name")
          .order("name", { ascending: true });

        if (!cancelled) {
          setSports((data || []).map((s) => s.name));
          setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  return { sports, loading };
}
