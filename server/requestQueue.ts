/**
 * نظام طابور ذكي لمعالجة عدد كبير من الطلبات المتزامنة
 * يوزع الحمل بالتساوي ويمنع الاختناقات
 */

interface QueuedRequest<T> {
  id: string;
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  timestamp: number;
}

export class SmartQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing = 0;
  private maxConcurrent: number;
  private processInterval: number; // ms بين المعالجة
  private metrics = {
    totalProcessed: 0,
    totalQueued: 0,
    averageWaitTime: 0,
    peakQueueSize: 0,
    startTime: Date.now()
  };

  constructor(maxConcurrent: number = 10, processInterval: number = 50) {
    this.maxConcurrent = maxConcurrent;
    this.processInterval = processInterval;
  }

  /**
   * أضف مهمة للطابور
   */
  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: Math.random().toString(36),
        task,
        resolve,
        reject,
        timestamp: Date.now()
      };

      this.queue.push(request);
      this.metrics.totalQueued++;

      if (this.queue.length > this.metrics.peakQueueSize) {
        this.metrics.peakQueueSize = this.queue.length;
      }

      // بدء المعالجة إذا كان هناك مساحة
      this.processNext();
    });
  }

  /**
   * معالجة الطلب التالي إذا كان هناك مساحة
   */
  private async processNext(): Promise<void> {
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.processing++;
    const request = this.queue.shift();

    if (!request) {
      this.processing--;
      return;
    }

    try {
      const waitTime = Date.now() - request.timestamp;
      this.metrics.totalProcessed++;
      
      // تحديث متوسط وقت الانتظار
      this.metrics.averageWaitTime = 
        (this.metrics.averageWaitTime * (this.metrics.totalProcessed - 1) + waitTime) / this.metrics.totalProcessed;

      const result = await request.task();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.processing--;
      
      // معالجة الطلب التالي
      if (this.queue.length > 0) {
        setTimeout(() => this.processNext(), this.processInterval);
      }
    }
  }

  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    return {
      ...this.metrics,
      currentQueueSize: this.queue.length,
      processingCount: this.processing,
      uptimeSeconds: Math.floor(uptime / 1000),
      throughputPerSecond: this.metrics.totalProcessed > 0 
        ? (this.metrics.totalProcessed / (uptime / 1000)).toFixed(2)
        : '0'
    };
  }

  clear(): void {
    this.queue = [];
    console.log("[SmartQueue] Queue cleared");
  }
}

/**
 * نظام بث الطلبات: يجمع طلبات متعددة ويرسلها معاً لتقليل عدد الاتصالات
 */
export class BatchProcessor<T, R> {
  private batch: T[] = [];
  private batchSize: number;
  private batchTimeout: number;
  private timer: NodeJS.Timeout | null = null;
  private processor: (items: T[]) => Promise<R[]>;

  constructor(
    processor: (items: T[]) => Promise<R[]>,
    batchSize: number = 50,
    batchTimeout: number = 100
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.batchTimeout = batchTimeout;
  }

  /**
   * أضف عنصراً للدفعة
   */
  async add(item: T): Promise<R | null> {
    return new Promise((resolve) => {
      this.batch.push(item);

      if (this.batch.length >= this.batchSize) {
        // دفعة ممتلئة - معالجة فورية
        this.flush().then(results => {
          resolve(results[results.length - 1] || null);
        });
      } else if (!this.timer) {
        // انتظر قليلاً لتجميع المزيد
        this.timer = setTimeout(() => {
          this.flush();
        }, this.batchTimeout);
      }
    });
  }

  /**
   * معالجة الدفعة الحالية فوراً
   */
  async flush(): Promise<R[]> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.batch.length === 0) {
      return [];
    }

    const itemsToProcess = this.batch;
    this.batch = [];

    try {
      return await this.processor(itemsToProcess);
    } catch (error) {
      console.error("[BatchProcessor] Error processing batch:", error);
      return [];
    }
  }
}
