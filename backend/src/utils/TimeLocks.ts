export enum Stage {
  SrcWithdrawal = 0,
  SrcPublicWithdrawal,
  SrcCancellation,
  SrcPublicCancellation,
  DstWithdrawal,
  DstPublicWithdrawal,
  DstCancellation,
}

const DEPLOYED_AT_MASK =
  0xffffffff00000000000000000000000000000000000000000000000000000000n;
const DEPLOYED_AT_OFFSET = 224n;

export type Timelocks = bigint;

export class TimeLocks {
  constructor(private timelocks: Timelocks = 0n) {
    this.timelocks = timelocks;
  }

  // Get current packed timelocks
  get value(): Timelocks {
    return this.timelocks;
  }

  setDeployedAt(value: bigint | number): TimeLocks {
    const v = BigInt(value);
    const newValue =
      (this.timelocks & ~DEPLOYED_AT_MASK) | (v << DEPLOYED_AT_OFFSET);
    return new TimeLocks(newValue);
  }

  rescueStart(rescueDelay: bigint | number): bigint {
    const delay = BigInt(rescueDelay);
    return (this.timelocks >> DEPLOYED_AT_OFFSET) + delay;
  }

  get(stage: Stage): bigint {
    const deployedAt = this.timelocks >> DEPLOYED_AT_OFFSET;
    const bitShift = BigInt(stage) * 32n;
    const stageValue = (this.timelocks >> bitShift) & 0xffffffffn;
    return deployedAt + stageValue;
  }

  private getField(stage: Stage): bigint {
    const bitShift = BigInt(stage) * 32n;
    return (this.timelocks >> bitShift) & 0xffffffffn;
  }

  /**
   * Set a stage value (relative offset from deployedAt)
   */
  put(stage: Stage, offsetSeconds: bigint | number): TimeLocks {
    const offset = BigInt(offsetSeconds) & 0xffffffffn; // 32-bit mask
    const bitShift = BigInt(stage) * 32n;
    const cleared = this.timelocks & ~(0xffffffffn << bitShift);
    const updated = cleared | (offset << bitShift);
    return new TimeLocks(updated);
  }

  /**
   * Decodes the full Timelocks struct fields into an object.
   */
  decode(): {
    deployedAt: bigint;
    srcWithdrawal: bigint;
    srcPublicWithdrawal: bigint;
    srcCancellation: bigint;
    srcPublicCancellation: bigint;
    dstWithdrawal: bigint;
    dstPublicWithdrawal: bigint;
    dstCancellation: bigint;
  } {
    const deployedAt = this.timelocks >> DEPLOYED_AT_OFFSET;
    const self = this; // Capture this context

    function getField(stage: Stage): bigint {
      const bitShift = BigInt(stage) * 32n;
      return (self.timelocks >> bitShift) & 0xffffffffn;
    }

    return {
      deployedAt,
      srcWithdrawal: deployedAt + getField(Stage.SrcWithdrawal),
      srcPublicWithdrawal: deployedAt + getField(Stage.SrcPublicWithdrawal),
      srcCancellation: deployedAt + getField(Stage.SrcCancellation),
      srcPublicCancellation: deployedAt + getField(Stage.SrcPublicCancellation),
      dstWithdrawal: deployedAt + getField(Stage.DstWithdrawal),
      dstPublicWithdrawal: deployedAt + getField(Stage.DstPublicWithdrawal),
      dstCancellation: deployedAt + getField(Stage.DstCancellation),
    };
  }

  static fromString(value: string): TimeLocks {
    return new TimeLocks(BigInt(value));
  }
}

//TODO: will test later
(async () => {
  const tl = new TimeLocks(
    47292744262135431918300440039222248813674199497332070479866542910276175400464n,
  );

  console.log('Original value:', tl.value.toString(16)); // original bigint value
  console.log('Updated value:', tl.value.toString(16)); // bigint with deployedAt set
  console.log('Rescue start:', tl.rescueStart(3600n).toString(16)); // bigint rescue start
  console.log('SrcWithdrawal:', tl.get(Stage.SrcWithdrawal).toString(16)); // bigint stage value
  console.log('Decoded:', tl.decode()); // full decoded object
})();
