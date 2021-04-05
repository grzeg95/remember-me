// tslint:disable:no-invalid-this

export {};

declare global {
  interface Set<T> {
    difference(otherSet: Set<T>): Set<T>;
    hasAll(otherSet: Set<T>): boolean;
    hasAny(otherSet: Set<T>): boolean;
    hasOnly(otherSet: Set<T>): boolean;
    intersection(otherSet: Set<T>): Set<T>;
    union(otherSet: Set<T>): Set<T>;
    toArray(): T[];
  }

  interface Array<T> {
    toSet(): Set<T>;
    shuffle(): T[];
    move(from: number, to: number): T[];
  }
}

Set.prototype.difference = function(otherSet: Set<any>): Set<any> {
  const difference = new Set();

  for (const element of this) {
    if (!otherSet.has(element)) {
      difference.add(element);
    }
  }

  return difference;
};

Set.prototype.hasAll = function(otherSet: Set<any>): boolean {

  for (const x of otherSet) {
    if (!this.has(x)) {
      return false;
    }
  }

  return true;
};

Set.prototype.hasAny = function(otherSet: Set<any>): boolean {

  for (const x of otherSet) {
    if (this.has(x)) {
      return true;
    }
  }

  return false;
};

Set.prototype.hasOnly = function(otherSet: Set<any>): boolean {

  if (this.size !== otherSet.size) {
    return false;
  }

  return this.hasAll(otherSet);
};

Set.prototype.intersection = function(otherSet: Set<any>): Set<any> {

  const intersection = new Set();

  for (const x of this) {
    if (otherSet.has(x)) {
      intersection.add(x);
    }
  }

  return intersection;
};

Set.prototype.union = function(otherSet: Set<any>): Set<any> {
  const union = new Set(this);

  for (const x of otherSet) {
    union.add(x);
  }

  return union;
};

Set.prototype.toArray = function(): any[] {
  return Array.from(this);
};

Array.prototype.toSet = function(): Set<any> {
  return new Set(this);
};

Array.prototype.shuffle = function(): any[] {
  for (let i = this.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [this[i], this[j]] = [this[j], this[i]];
  }
  return [...this];
};

Array.prototype.move = function(from: number, to: number): any[] {
  this.splice(to, 0, this.splice(from, 1)[0]);
  return [...this];
};
