/*
 * QR codes for the donation addresses, made in the page from the very address it shows, so the code and the text can
 * never differ. ISO/IEC 18004: byte mode, error correction level M and the standard quiet zone of 4 modules, the
 * choices the app's codes make too (README.md, "Donations"). Written for Crypten; it loads nothing from anywhere.
 *
 * CryptenQr.encode(text) gives {size, dark}, dark[y][x] being true for a dark module; CryptenQr.svg(text, label) an
 * <svg> of it, dark on white whatever the theme, since that is what scanners read.
 */
(function () {
    "use strict";

    // Level M, for versions 1 to 40 (index 0 is unused): error correction codewords per block, and number of blocks.
    const ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26,
        28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
    const BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23,
        25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
    /** Level M's two bits in the format information. */
    const LEVEL_M = 0;
    const QUIET_ZONE = 4;

    /** How many modules of a version carry data and error correction (everything but the fixed patterns). */
    function rawDataModules(version) {
        let modules = (16 * version + 128) * version + 64;
        if (version >= 2) {
            const align = Math.floor(version / 7) + 2;
            modules -= (25 * align - 10) * align - 55;
            if (version >= 7) {
                modules -= 36;
            }
        }
        return modules;
    }

    function dataCodewords(version) {
        return Math.floor(rawDataModules(version) / 8) - ECC_PER_BLOCK[version] * BLOCKS[version];
    }

    /** The centres of the alignment patterns, the same list across and down. */
    function alignmentPositions(version) {
        if (version === 1) {
            return [];
        }
        const count = Math.floor(version / 7) + 2;
        const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
        const positions = [6];
        for (let at = version * 4 + 10; positions.length < count; at -= step) {
            positions.splice(1, 0, at);
        }
        return positions;
    }

    /** Multiplication in GF(2^8) modulo x^8 + x^4 + x^3 + x^2 + 1. */
    function multiply(x, y) {
        let z = 0;
        for (let i = 7; i >= 0; i--) {
            z = (z << 1) ^ ((z >>> 7) * 0x11d);
            z ^= ((y >>> i) & 1) * x;
        }
        return z;
    }

    /** The Reed-Solomon generator polynomial of a degree, highest coefficient first, the leading 1 left out. */
    function divisor(degree) {
        const result = new Array(degree).fill(0);
        result[degree - 1] = 1;
        let root = 1;
        for (let i = 0; i < degree; i++) {
            for (let j = 0; j < degree; j++) {
                result[j] = multiply(result[j], root);
                if (j + 1 < degree) {
                    result[j] ^= result[j + 1];
                }
            }
            root = multiply(root, 2);
        }
        return result;
    }

    function remainder(data, generator) {
        const result = new Array(generator.length).fill(0);
        for (const value of data) {
            const factor = value ^ result.shift();
            result.push(0);
            generator.forEach((coefficient, i) => {
                result[i] ^= multiply(coefficient, factor);
            });
        }
        return result;
    }

    /** The data codewords split into blocks, each followed by its error correction, interleaved. */
    function interleave(version, data) {
        const blocks = BLOCKS[version];
        const eccLength = ECC_PER_BLOCK[version];
        const raw = Math.floor(rawDataModules(version) / 8);
        const shortBlocks = blocks - raw % blocks;
        const shortLength = Math.floor(raw / blocks);
        const generator = divisor(eccLength);
        const all = [];
        for (let i = 0, k = 0; i < blocks; i++) {
            const block = data.slice(k, k + shortLength - eccLength + (i < shortBlocks ? 0 : 1));
            k += block.length;
            const ecc = remainder(block, generator);
            if (i < shortBlocks) {
                block.push(0);
            }
            all.push(block.concat(ecc));
        }
        const result = [];
        for (let i = 0; i < all[0].length; i++) {
            all.forEach((block, j) => {
                // The padding byte of a short block is not part of the code.
                if (i !== shortLength - eccLength || j >= shortBlocks) {
                    result.push(block[i]);
                }
            });
        }
        return result;
    }

    /** The text as a byte-mode segment, terminated and padded to fill the smallest version that holds it. */
    function codewords(text) {
        const bytes = new TextEncoder().encode(text);
        let version = 1;
        while (4 + (version < 10 ? 8 : 16) + bytes.length * 8 > dataCodewords(version) * 8) {
            version++;
            if (version > 40) {
                throw new RangeError("Too long for a QR code: " + bytes.length + " bytes");
            }
        }
        const bits = [];
        const put = (value, length) => {
            for (let i = length - 1; i >= 0; i--) {
                bits.push((value >>> i) & 1);
            }
        };
        put(0b0100, 4);
        put(bytes.length, version < 10 ? 8 : 16);
        bytes.forEach((b) => put(b, 8));
        const capacity = dataCodewords(version) * 8;
        put(0, Math.min(4, capacity - bits.length));
        put(0, (8 - bits.length % 8) % 8);
        for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) {
            put(pad, 8);
        }
        const data = [];
        for (let i = 0; i < bits.length; i += 8) {
            let value = 0;
            for (let j = 0; j < 8; j++) {
                value = (value << 1) | bits[i + j];
            }
            data.push(value);
        }
        return {version, data};
    }

    function encode(text) {
        const {version, data} = codewords(text);
        const size = version * 4 + 17;
        const dark = Array.from({length: size}, () => new Array(size).fill(false));
        const fixed = Array.from({length: size}, () => new Array(size).fill(false));
        const set = (x, y, on) => {
            dark[y][x] = on;
            fixed[y][x] = true;
        };

        for (let i = 0; i < size; i++) {
            set(6, i, i % 2 === 0);
            set(i, 6, i % 2 === 0);
        }
        for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
            for (let dy = -4; dy <= 4; dy++) {
                for (let dx = -4; dx <= 4; dx++) {
                    const x = cx + dx;
                    const y = cy + dy;
                    if (x >= 0 && x < size && y >= 0 && y < size) {
                        const ring = Math.max(Math.abs(dx), Math.abs(dy));
                        set(x, y, ring !== 2 && ring !== 4);
                    }
                }
            }
        }
        const align = alignmentPositions(version);
        const last = align.length - 1;
        align.forEach((ax, i) => align.forEach((ay, j) => {
            if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) {
                return;
            }
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
                }
            }
        }));

        const formatBits = (mask) => {
            const value = (LEVEL_M << 3) | mask;
            let rem = value;
            for (let i = 0; i < 10; i++) {
                rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
            }
            const bits = ((value << 10) | rem) ^ 0x5412;
            const bit = (i) => ((bits >>> i) & 1) !== 0;
            for (let i = 0; i <= 5; i++) {
                set(8, i, bit(i));
            }
            set(8, 7, bit(6));
            set(8, 8, bit(7));
            set(7, 8, bit(8));
            for (let i = 9; i < 15; i++) {
                set(14 - i, 8, bit(i));
            }
            for (let i = 0; i < 8; i++) {
                set(size - 1 - i, 8, bit(i));
            }
            for (let i = 8; i < 15; i++) {
                set(8, size - 15 + i, bit(i));
            }
            set(8, size - 8, true);
        };
        formatBits(0);
        if (version >= 7) {
            let rem = version;
            for (let i = 0; i < 12; i++) {
                rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
            }
            const bits = (version << 12) | rem;
            for (let i = 0; i < 18; i++) {
                const on = ((bits >>> i) & 1) !== 0;
                const a = size - 11 + i % 3;
                const b = Math.floor(i / 3);
                set(a, b, on);
                set(b, a, on);
            }
        }

        // The codewords, in columns two modules wide from the right, zigzagging up and down, around the fixed patterns.
        const stream = interleave(version, data);
        let i = 0;
        for (let right = size - 1; right >= 1; right -= 2) {
            if (right === 6) {
                right = 5;
            }
            for (let vertical = 0; vertical < size; vertical++) {
                for (let j = 0; j < 2; j++) {
                    const x = right - j;
                    const y = ((right + 1) & 2) === 0 ? size - 1 - vertical : vertical;
                    if (!fixed[y][x] && i < stream.length * 8) {
                        dark[y][x] = ((stream[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
                        i++;
                    }
                }
            }
        }

        const flip = (mask) => {
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    let invert;
                    switch (mask) {
                        case 0: invert = (x + y) % 2 === 0; break;
                        case 1: invert = y % 2 === 0; break;
                        case 2: invert = x % 3 === 0; break;
                        case 3: invert = (x + y) % 3 === 0; break;
                        case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
                        case 5: invert = (x * y) % 2 + (x * y) % 3 === 0; break;
                        case 6: invert = ((x * y) % 2 + (x * y) % 3) % 2 === 0; break;
                        default: invert = ((x + y) % 2 + (x * y) % 3) % 2 === 0;
                    }
                    if (invert && !fixed[y][x]) {
                        dark[y][x] = !dark[y][x];
                    }
                }
            }
        };
        let best = 0;
        let lowest = Infinity;
        for (let mask = 0; mask < 8; mask++) {
            flip(mask);
            formatBits(mask);
            const score = penalty(dark, size);
            if (score < lowest) {
                best = mask;
                lowest = score;
            }
            flip(mask);
        }
        flip(best);
        formatBits(best);
        return {size, dark};
    }

    /**
     * The four penalty rules, scored the way ZXing scores them (its MaskUtil), so the mask chosen here is the one the
     * app's ZXing chooses and every code is the very code the app shows; the lowest score wins.
     */
    function penalty(dark, size) {
        let score = 0;
        // Runs of five or more modules of one colour, across and down: 3, and 1 more for every module beyond five.
        for (let i = 0; i < size; i++) {
            for (const across of [true, false]) {
                let run = 0;
                let previous = null;
                for (let j = 0; j < size; j++) {
                    const bit = across ? dark[i][j] : dark[j][i];
                    if (bit === previous) {
                        run++;
                    } else {
                        score += run >= 5 ? run - 2 : 0;
                        run = 1;
                        previous = bit;
                    }
                }
                score += run >= 5 ? run - 2 : 0;
            }
        }
        // Blocks of 2 × 2 modules of one colour: 3 each.
        for (let y = 0; y < size - 1; y++) {
            for (let x = 0; x < size - 1; x++) {
                const c = dark[y][x];
                if (c === dark[y][x + 1] && c === dark[y + 1][x] && c === dark[y + 1][x + 1]) {
                    score += 3;
                }
            }
        }
        // Dark-light-dark-dark-dark-light-dark, like a finder pattern, with four light modules on one side: 40 each.
        const light = (at, from, to) => {
            if (from < 0 || to > size) {
                return false;
            }
            for (let k = from; k < to; k++) {
                if (at(k)) {
                    return false;
                }
            }
            return true;
        };
        const finder = (at, k) => at(k) && !at(k + 1) && at(k + 2) && at(k + 3) && at(k + 4) && !at(k + 5) && at(k + 6)
            && (light(at, k - 4, k) || light(at, k + 7, k + 11));
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (x + 6 < size && finder((k) => dark[y][k], x)) {
                    score += 40;
                }
                if (y + 6 < size && finder((k) => dark[k][x], y)) {
                    score += 40;
                }
            }
        }
        // How far the share of dark modules strays from half: 10 for every whole 5 %.
        let count = 0;
        dark.forEach((row) => row.forEach((c) => {
            count += c ? 1 : 0;
        }));
        const total = size * size;
        return score + Math.floor(Math.abs(count * 2 - total) * 10 / total) * 10;
    }

    /** The code as an <svg>: one path of dark runs on a white square with the quiet zone. */
    function svg(text, label) {
        const {size, dark} = encode(text);
        const side = size + QUIET_ZONE * 2;
        const ns = "http://www.w3.org/2000/svg";
        const root = document.createElementNS(ns, "svg");
        root.setAttribute("viewBox", "0 0 " + side + " " + side);
        root.setAttribute("role", "img");
        root.setAttribute("aria-label", label);
        root.setAttribute("shape-rendering", "crispEdges");
        const paper = document.createElementNS(ns, "rect");
        paper.setAttribute("width", side);
        paper.setAttribute("height", side);
        paper.setAttribute("fill", "#ffffff");
        let d = "";
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size;) {
                if (!dark[y][x]) {
                    x++;
                    continue;
                }
                let run = 1;
                while (x + run < size && dark[y][x + run]) {
                    run++;
                }
                d += "M" + (x + QUIET_ZONE) + " " + (y + QUIET_ZONE) + "h" + run + "v1h-" + run + "z";
                x += run;
            }
        }
        const ink = document.createElementNS(ns, "path");
        ink.setAttribute("d", d);
        ink.setAttribute("fill", "#08122a");
        root.append(paper, ink);
        return root;
    }

    globalThis.CryptenQr = Object.freeze({encode, svg});
}());
