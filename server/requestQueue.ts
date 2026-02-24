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
  timeout?: NodeJS.Timeout;
}

export class SmartQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing = 0;
  private maxConcurrent: number;
  private processInterval: number; // ms بين المعالجة
  private MAX_QUEUE_SIZE = 1000; // Backpressure limit
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
    // Backpressure: Reject if queue is full
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      throw new Error(`Queue full (${this.MAX_QUEUE_SIZE} items). Server overloaded - please retry later.`);
    }

    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: Math.random().toString(36),
        task,
        resolve,
        reject,
        timestamp: Date.now(),
        timeout: setTimeout(() => {
          reject(new Error('Request timeout after 30s'));
          const index = this.queue.indexOf(request);
          if (index !== -1) this.queue.splice(index, 1);
        }, 30000)
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
      // Clear timeout since we're processing now
      if (request.timeout) clearTimeout(request.timeout);

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
 * نظام بث الطلبات المحدث: يجمع طلبات متعددة ويرسلها معاً لتقليل عدد الاتصالات (تم إصلاح تعهدات المعالجة).
 */
export class BatchProcessor<T, R> {
  private pendingItems: Array<{ item: T; resolve: (value: R) => void; reject: (reason?: any) => void }> = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private processor: (items: T[]) => Promise<R[]>,
    private batchSize: number = 50,
    private batchTimeout: number = 100
  ) { }

  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.pendingItems.push({ item, resolve, reject });
      if (this.pendingItems.length >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.batchTimeout);
      }
    });
  }

  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const items = this.pendingItems;
    this.pendingItems = [];
    try {
      const results = await this.processor(items.map(p => p.item));
      items.forEach((p, i) => p.resolve(results[i]));
    } catch (error) {
      items.forEach(p => p.reject(error));
    }
  }
}
