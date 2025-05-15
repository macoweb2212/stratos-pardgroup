type PromiseFunction = () => Promise<any>;

export class PromiseQueue {
    private queue: PromiseFunction[] = [];
    private running: boolean = false;

    add(promiseFn: PromiseFunction): void {
        this.queue.push(promiseFn);
        if (!this.running) this.runNext();
    }

    private async runNext(): Promise<void> {
        if (this.queue.length === 0) {
            this.running = false;
            return;
        }

        this.running = true;
        const fn = this.queue.shift();
        if (fn) {
            try {
                await fn();
            } catch (error) {
                console.log(error);
            }
        }
        this.runNext();
    }
}
