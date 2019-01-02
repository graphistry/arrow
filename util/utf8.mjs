// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import { toUint8Array } from './buffer';
import { TextDecoder as TextDecoderPolyfill, TextEncoder as TextEncoderPolyfill, } from 'text-encoding-utf-8';
/** @ignore */
export const decodeUtf8 = ((decoder) => {
    /** @suppress {missingRequire} */
    const NodeBuffer = typeof Buffer !== 'undefined' ? Buffer : null;
    return !NodeBuffer ? decoder.decode.bind(decoder) : (input) => {
        const { buffer, byteOffset, length } = toUint8Array(input);
        return NodeBuffer.from(buffer, byteOffset, length).toString();
    };
})(new (typeof TextDecoder !== 'undefined' ? TextDecoder : TextDecoderPolyfill)());
/** @ignore */
export const encodeUtf8 = ((encoder) => {
    /** @suppress {missingRequire} */
    const NodeBuffer = typeof Buffer !== 'undefined' ? Buffer : null;
    return !NodeBuffer ? encoder.encode.bind(encoder) :
        (input = '') => toUint8Array(NodeBuffer.from(input, 'utf8'));
})(new (typeof TextEncoder !== 'undefined' ? TextEncoder : TextEncoderPolyfill)());

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInV0aWwvdXRmOC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSw2REFBNkQ7QUFDN0QsK0RBQStEO0FBQy9ELHdEQUF3RDtBQUN4RCw2REFBNkQ7QUFDN0Qsb0RBQW9EO0FBQ3BELDZEQUE2RDtBQUM3RCw2REFBNkQ7QUFDN0QsRUFBRTtBQUNGLCtDQUErQztBQUMvQyxFQUFFO0FBQ0YsNkRBQTZEO0FBQzdELDhEQUE4RDtBQUM5RCx5REFBeUQ7QUFDekQsNERBQTREO0FBQzVELDBEQUEwRDtBQUMxRCxxQkFBcUI7QUFFckIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUN4QyxPQUFPLEVBQ0gsV0FBVyxJQUFJLG1CQUFtQixFQUNsQyxXQUFXLElBQUksbUJBQW1CLEdBQ3JDLE1BQU0scUJBQXFCLENBQUM7QUFFN0IsY0FBYztBQUNkLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7SUFDbkMsaUNBQWlDO0lBQ2pDLE1BQU0sVUFBVSxHQUFHLE9BQU8sTUFBTSxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDakUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBd0MsRUFBRSxFQUFFO1FBQzdGLE1BQU0sRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsRSxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxXQUFXLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRW5GLGNBQWM7QUFDZCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ25DLGlDQUFpQztJQUNqQyxNQUFNLFVBQVUsR0FBRyxPQUFPLE1BQU0sS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ2pFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDL0MsQ0FBQyxLQUFLLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNyRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxXQUFXLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDIiwiZmlsZSI6InV0aWwvdXRmOC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIExpY2Vuc2VkIHRvIHRoZSBBcGFjaGUgU29mdHdhcmUgRm91bmRhdGlvbiAoQVNGKSB1bmRlciBvbmVcbi8vIG9yIG1vcmUgY29udHJpYnV0b3IgbGljZW5zZSBhZ3JlZW1lbnRzLiAgU2VlIHRoZSBOT1RJQ0UgZmlsZVxuLy8gZGlzdHJpYnV0ZWQgd2l0aCB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25cbi8vIHJlZ2FyZGluZyBjb3B5cmlnaHQgb3duZXJzaGlwLiAgVGhlIEFTRiBsaWNlbnNlcyB0aGlzIGZpbGVcbi8vIHRvIHlvdSB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGVcbi8vIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZVxuLy8gd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLFxuLy8gc29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW5cbi8vIFwiQVMgSVNcIiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXG4vLyBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiAgU2VlIHRoZSBMaWNlbnNlIGZvciB0aGVcbi8vIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmQgbGltaXRhdGlvbnNcbi8vIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG5pbXBvcnQgeyB0b1VpbnQ4QXJyYXkgfSBmcm9tICcuL2J1ZmZlcic7XG5pbXBvcnQge1xuICAgIFRleHREZWNvZGVyIGFzIFRleHREZWNvZGVyUG9seWZpbGwsXG4gICAgVGV4dEVuY29kZXIgYXMgVGV4dEVuY29kZXJQb2x5ZmlsbCxcbn0gZnJvbSAndGV4dC1lbmNvZGluZy11dGYtOCc7XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY29uc3QgZGVjb2RlVXRmOCA9ICgoZGVjb2RlcikgPT4ge1xuICAgIC8qKiBAc3VwcHJlc3Mge21pc3NpbmdSZXF1aXJlfSAqL1xuICAgIGNvbnN0IE5vZGVCdWZmZXIgPSB0eXBlb2YgQnVmZmVyICE9PSAndW5kZWZpbmVkJyA/IEJ1ZmZlciA6IG51bGw7XG4gICAgcmV0dXJuICFOb2RlQnVmZmVyID8gZGVjb2Rlci5kZWNvZGUuYmluZChkZWNvZGVyKSA6IChpbnB1dDogQXJyYXlCdWZmZXJMaWtlIHwgQXJyYXlCdWZmZXJWaWV3KSA9PiB7XG4gICAgICAgIGNvbnN0IHsgYnVmZmVyLCBieXRlT2Zmc2V0LCBsZW5ndGggfSA9IHRvVWludDhBcnJheShpbnB1dCk7XG4gICAgICAgIHJldHVybiBOb2RlQnVmZmVyLmZyb20oYnVmZmVyLCBieXRlT2Zmc2V0LCBsZW5ndGgpLnRvU3RyaW5nKCk7XG4gICAgfTtcbn0pKG5ldyAodHlwZW9mIFRleHREZWNvZGVyICE9PSAndW5kZWZpbmVkJyA/IFRleHREZWNvZGVyIDogVGV4dERlY29kZXJQb2x5ZmlsbCkoKSk7XG5cbi8qKiBAaWdub3JlICovXG5leHBvcnQgY29uc3QgZW5jb2RlVXRmOCA9ICgoZW5jb2RlcikgPT4ge1xuICAgIC8qKiBAc3VwcHJlc3Mge21pc3NpbmdSZXF1aXJlfSAqL1xuICAgIGNvbnN0IE5vZGVCdWZmZXIgPSB0eXBlb2YgQnVmZmVyICE9PSAndW5kZWZpbmVkJyA/IEJ1ZmZlciA6IG51bGw7XG4gICAgcmV0dXJuICFOb2RlQnVmZmVyID8gZW5jb2Rlci5lbmNvZGUuYmluZChlbmNvZGVyKSA6XG4gICAgICAgIChpbnB1dCA9ICcnKSA9PiB0b1VpbnQ4QXJyYXkoTm9kZUJ1ZmZlci5mcm9tKGlucHV0LCAndXRmOCcpKTtcbn0pKG5ldyAodHlwZW9mIFRleHRFbmNvZGVyICE9PSAndW5kZWZpbmVkJyA/IFRleHRFbmNvZGVyIDogVGV4dEVuY29kZXJQb2x5ZmlsbCkoKSk7XG4iXX0=