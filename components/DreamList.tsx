"use client"

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from "@/components/ui/use-toast"

interface Dream {
  id: number;
  created_at: string;
  audio_url: string;
  transcription: string;
  interpretation: string;
}

interface DreamListProps {
  userId: string;
}

export default function DreamList({ userId }: DreamListProps) {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const supabase = createClientComponentClient();
  const { toast } = useToast()

  useEffect(() => {
    const fetchDreams = async () => {
      try {
        const { data, error } = await supabase
          .from('dreams')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDreams(data || []);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      }
    };

    fetchDreams();
  }, [userId, supabase, toast]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Your Dreams</h2>
      {dreams.map((dream) => (
        <div key={dream.id} className="mb-6 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-500 mb-2">{new Date(dream.created_at).toLocaleString()}</p>
          <audio src={dream.audio_url} controls className="mb-2" />
          <p className="mb-2"><strong>Transcription:</strong> {dream.transcription}</p>
          <p><strong>Interpretation:</strong> {dream.interpretation}</p>
        </div>
      ))}
    </div>
  );
}