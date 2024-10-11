"use client"

import { useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast"
import { pipeline } from '@xenova/transformers';

interface DreamRecorderProps {
  userId: string;
}

export default function DreamRecorder({ userId }: DreamRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const supabase = createClientComponentClient();
  const { toast } = useToast()

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 30000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadDream = async () => {
    if (!audioBlob) return;

    try {
      const fileName = `${userId}_${Date.now()}.webm`;
      const { data, error } = await supabase.storage
        .from('dreams')
        .upload(fileName, audioBlob);

      if (error) throw error;

      const publicURL = supabase.storage.from('dreams').getPublicUrl(fileName).data.publicUrl;

      // Transcribe audio
      const transcriptionPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small');
      const transcription = await transcriptionPipeline(audioBlob);

      // Interpret dream using Gemini
      const interpretationResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Interpret this dream: ${transcription.text}`,
            }],
          }],
        }),
      });

      const interpretationData = await interpretationResponse.json();
      const interpretation = interpretationData.candidates[0].content.parts[0].text;

      const { error: insertError } = await supabase
        .from('dreams')
        .insert({
          user_id: userId,
          audio_url: publicURL,
          transcription: transcription.text,
          interpretation: interpretation,
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Dream recorded and interpreted successfully!",
      })

      setAudioBlob(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">Record Your Dream</h2>
      {!isRecording && !audioBlob && (
        <Button onClick={startRecording}>Start Recording</Button>
      )}
      {isRecording && (
        <Button onClick={stopRecording} variant="destructive">Stop Recording</Button>
      )}
      {audioBlob && (
        <Button onClick={uploadDream}>Upload Dream</Button>
      )}
    </div>
  );
}