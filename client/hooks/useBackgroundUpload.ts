import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useUploadContext } from './UploadContext';

export interface UploadJob {
  id: string;
  type: string;
  year: number;
  month: number;
  data: any;
  validRowIndices?: number[];
  isUpdate?: boolean;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

const CHUNK_SIZE = 10000; // Reduced to 10k rows to avoid BSON overflow
const DELAY_BETWEEN_CHUNKS = 500; // Reduced to 0.5 seconds for faster uploads
const VALIDATION_CHUNK_SIZE = 5000; // Keep at 5000 for validation

export function useBackgroundUpload() {
  const [uploadQueue, setUploadQueue] = useState<UploadJob[]>([]);
  const { currentJob, setCurrentJob: setContextCurrentJob } = useUploadContext();
  const processingRef = useRef(false);
  const toastIdRef = useRef<string | number | null>(null);

  const uploadChunks = useCallback(
    async (
      job: UploadJob,
      onProgress: (progress: number) => void
    ): Promise<void> => {
      const { data, type, year, month, validRowIndices, isUpdate } = job;
      const dataRows = data.slice(1); // Skip headers
      const headers = data[0];
      const numChunks = Math.ceil(dataRows.length / CHUNK_SIZE);

      console.log(`📦 Starting background upload: ${dataRows.length} rows, ${numChunks} chunks`);

      for (let chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
        const startIdx = chunkIndex * CHUNK_SIZE;
        const endIdx = Math.min(startIdx + CHUNK_SIZE, dataRows.length);
        const chunkData = dataRows.slice(startIdx, endIdx);
        const chunkRows = chunkData.length;

        const chunkBody = {
          type,
          year,
          month,
          rows: chunkRows,
          columns: data[0].length,
          data: [headers, ...chunkData],
          chunkIndex,
          totalChunks: numChunks,
          isChunked: numChunks > 1
        };

        if (chunkIndex > 0) {
          delete (chunkBody as any).validRowIndices;
        } else if (validRowIndices) {
          (chunkBody as any).validRowIndices = validRowIndices;
        }

        let retryCount = 0;
        const MAX_RETRIES = 5;
        let chunkSuccess = false;

        while (retryCount < MAX_RETRIES && !chunkSuccess) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // Increased to 5 minutes for larger chunks

            const method = isUpdate && chunkIndex === 0 ? 'PUT' : 'POST';
            const endpoint =
              isUpdate && chunkIndex === 0
                ? '/api/upload'
                : '/api/upload/chunk';

            console.log(
              `📤 Uploading chunk ${chunkIndex + 1}/${numChunks} (rows ${startIdx + 1}-${endIdx})`
            );

            const response = await fetch(endpoint, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(chunkBody),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              let errorText = 'Chunk upload failed';
              try {
                const errorData = await response.json();
                errorText = errorData.error || errorText;
              } catch (e) {}
              throw new Error(`Server error: ${errorText}`);
            }

            const result = await response.json();
            console.log(
              `✅ Chunk ${chunkIndex + 1} uploaded successfully:`,
              result.message
            );
            chunkSuccess = true;

            // Update progress
            const progress = Math.round(((chunkIndex + 1) / numChunks) * 100);
            onProgress(progress);

            // Add delay before next chunk (except for last chunk)
            if (chunkIndex < numChunks - 1) {
              console.log(`⏳ Waiting ${DELAY_BETWEEN_CHUNKS / 1000}s before next chunk...`);
              await new Promise((resolve) =>
                setTimeout(resolve, DELAY_BETWEEN_CHUNKS)
              );
            }
          } catch (error) {
            retryCount++;
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            console.error(
              `❌ Chunk ${chunkIndex + 1} attempt ${retryCount} failed:`,
              errorMsg
            );

            if (retryCount < MAX_RETRIES) {
              const waitMs = 1000 * retryCount; // Reduced from 3s to 1s multiplier
              console.log(`  Retrying in ${waitMs}ms...`);
              await new Promise((resolve) => setTimeout(resolve, waitMs));
            } else {
              throw new Error(
                `Chunk ${chunkIndex + 1} failed after ${MAX_RETRIES} attempts: ${errorMsg}`
              );
            }
          }
        }

        if (!chunkSuccess) {
          throw new Error(
            `Chunk ${chunkIndex + 1} failed - all retry attempts exhausted`
          );
        }
      }

      // Finalize upload
      console.log('🔼 All chunks uploaded, finalizing...');
      
      // Wait a bit longer to ensure all chunks are properly stored on server
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Increased from 0.5s to 2s

      let finalizeSuccess = false;
      let finalizeRetries = 0;
      const MAX_FINALIZE_RETRIES = 3;

      while (!finalizeSuccess && finalizeRetries < MAX_FINALIZE_RETRIES) {
        try {
          const finalizeController = new AbortController();
          const finalizeTimeoutId = setTimeout(
            () => finalizeController.abort(),
            60000
          );

          console.log(`🔄 Attempting to finalize upload (attempt ${finalizeRetries + 1}/${MAX_FINALIZE_RETRIES})...`);
          console.log(`  Storage key: ${type}_${year}_${month}`);

          const finalizeResponse = await fetch('/api/upload/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type,
              year,
              month,
              isUpdate
            }),
            signal: finalizeController.signal
          });

          clearTimeout(finalizeTimeoutId);

          if (!finalizeResponse.ok) {
            let errorText = 'Failed to finalize upload';
            try {
              const errorData = await finalizeResponse.json();
              errorText = errorData.error || errorText;
            } catch (e) {}
            throw new Error(errorText);
          }

          const result = await finalizeResponse.json();
          finalizeSuccess = true;
          console.log('✅ Upload finalized successfully:', result);
          onProgress(100);
        } catch (finalizeError) {
          finalizeRetries++;
          const errorMsg =
            finalizeError instanceof Error
              ? finalizeError.message
              : String(finalizeError);
          console.error(
            `❌ Finalize attempt ${finalizeRetries} failed:`,
            errorMsg
          );

          if (finalizeRetries < MAX_FINALIZE_RETRIES) {
            const waitMs = 1000 * finalizeRetries; // Reduced from 3s to 1s multiplier
            console.log(`  Retrying in ${waitMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
          } else {
            throw new Error(
              `Upload finalization failed after ${MAX_FINALIZE_RETRIES} attempts: ${errorMsg}`
            );
          }
        }
      }
    },
    []
  );

  const processQueue = useCallback(async () => {
    if (processingRef.current || uploadQueue.length === 0) {
      return;
    }

    processingRef.current = true;

    try {
      const job = uploadQueue[0];
      setContextCurrentJob({ ...job, status: 'uploading' });

      await uploadChunks(job, (progress) => {
        setContextCurrentJob((prev: UploadJob | null) =>
          prev ? { ...prev, progress } : null
        );
      });

      const completedJob = { ...job, status: 'completed' as const, progress: 100 };
      setContextCurrentJob(completedJob);

      // Dismiss loading toast and show success toast
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      
      toast.success(`✅ Upload Complete!`, {
        description: `${job.type} data for ${job.month}/${job.year} uploaded successfully`,
        duration: 5000
      });

      // Remove from queue and continue
      setUploadQueue((prev) => prev.slice(1));
      setContextCurrentJob(null);

      // Process next job immediately
      setTimeout(() => {
        processingRef.current = false;
        if (uploadQueue.length > 1) {
          processQueue();
        }
      }, 100); // Reduced from 1s to 0.1s
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      setContextCurrentJob((prev: UploadJob | null) =>
        prev ? { ...prev, status: 'failed', error: errorMsg } : null
      );

      // Dismiss loading toast and show error toast
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }

      toast.error('❌ Upload Failed', {
        description: errorMsg,
        duration: 5000
      });

      // Keep the job in queue but mark as failed
      setUploadQueue((prev) =>
        prev.map((j) => (j.id === uploadQueue[0].id ? { ...j, status: 'failed' } : j))
      );

      processingRef.current = false;
    }
  }, [uploadQueue, uploadChunks, setContextCurrentJob]);

  const addUploadJob = useCallback(
    (
      type: string,
      year: number,
      month: number,
      data: any,
      validRowIndices?: number[],
      isUpdate?: boolean
    ): string => {
      const jobId = `${type}-${year}-${month}-${Date.now()}`;
      const newJob: UploadJob = {
        id: jobId,
        type,
        year,
        month,
        data,
        validRowIndices,
        isUpdate,
        status: 'pending',
        progress: 0
      };

      setUploadQueue((prev) => {
        const updated = [...prev, newJob];
        
        // Auto-start immediately if not processing
        if (!processingRef.current && updated.length === 1) {
          // Use a microtask to start processing after state update
          Promise.resolve().then(() => processQueue());
        }
        
        return updated;
      });

      // Store toast ID so we can dismiss it later
      const toastId = toast.loading(`⏳ Upload queued for ${type}`, {
        description: `Starting upload...`
      });
      toastIdRef.current = toastId;

      return jobId;
    },
    [processQueue]
  );

  // Auto-process queue when it changes
  useEffect(() => {
    if (uploadQueue.length > 0 && !processingRef.current) {
      processQueue();
    }
  }, [uploadQueue, processQueue]);

  return {
    uploadQueue,
    currentJob,
    addUploadJob,
    processQueue
  };
}
