export class Retry {
  private static _defaultTimeout = 5000;
  private static _defaultInterval = 300;

  private static delay(milliseconds: number) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private static timeoutReached(startTime: Date, timeout: number): boolean {
    return Date.now() - Number(startTime) > timeout;
  }

  static async until<T>({
    retryFunc,
    checkFunc,
    timeout,
    interval,
    throwOnError,
    throwOnTimeout,
  }: RetryParams<T>): Promise<T> {
    timeout = timeout ?? this._defaultTimeout;
    interval = interval ?? this._defaultInterval;
    throwOnTimeout = throwOnTimeout ?? true;
    throwOnError = throwOnError ?? false;

    const startTime = new Date(Date.now());
    let lastValue: T | null = null;
    let lastError: Error | null = null;

    do {
      try {
        lastValue = await retryFunc();
        const result = await checkFunc(lastValue);
        if (result) {
          return lastValue;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        lastError = new Error(message);
        if (throwOnError) throw lastError;
      }
      await this.delay(interval);
    } while (!this.timeoutReached(startTime, timeout));
    console.log(`Retry finished by timeout: ${timeout}`);
    if (throwOnTimeout) {
      lastError = lastError ?? new Error('Retry timeout reached');
      throw lastError;
    }
    if (lastValue === null) throw Error('lastValue is null');
    return lastValue;
  }

  static whileError<T>(
    retryFunc: () => Promise<T> | T,
    timeout?: number,
    interval?: number,
  ) {
    return this.until({
      retryFunc,
      checkFunc: () => true,
      timeout,
      interval,
      throwOnError: false,
      throwOnTimeout: true,
    });
  }
}

type RetryParams<T> = {
  retryFunc: () => Promise<T> | T,
  checkFunc: (result: T) => Promise<boolean> | boolean,
  timeout?: number,
  interval?: number,
  throwOnTimeout?: boolean,
  throwOnError?: boolean,
}
