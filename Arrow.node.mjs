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
import streamAdapters from './io/adapters';
import { RecordBatchReader } from './ipc/reader';
import { RecordBatchWriter } from './ipc/writer';
import { toReadableNodeStream } from './ipc/node/iterable';
import { recordBatchReaderThroughNodeStream } from './ipc/node/reader';
import { recordBatchWriterThroughNodeStream } from './ipc/node/writer';
streamAdapters.toReadableNodeStream = toReadableNodeStream;
RecordBatchReader['throughNode'] = recordBatchReaderThroughNodeStream;
RecordBatchWriter['throughNode'] = recordBatchWriterThroughNodeStream;
export * from './Arrow.dom';

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkFycm93Lm5vZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsNkRBQTZEO0FBQzdELCtEQUErRDtBQUMvRCx3REFBd0Q7QUFDeEQsNkRBQTZEO0FBQzdELG9EQUFvRDtBQUNwRCw2REFBNkQ7QUFDN0QsNkRBQTZEO0FBQzdELEVBQUU7QUFDRiwrQ0FBK0M7QUFDL0MsRUFBRTtBQUNGLDZEQUE2RDtBQUM3RCw4REFBOEQ7QUFDOUQseURBQXlEO0FBQ3pELDREQUE0RDtBQUM1RCwwREFBMEQ7QUFDMUQscUJBQXFCO0FBRXJCLE9BQU8sY0FBYyxNQUFNLGVBQWUsQ0FBQztBQUMzQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDakQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ2pELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzNELE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRXZFLGNBQWMsQ0FBQyxvQkFBb0IsR0FBRyxvQkFBb0IsQ0FBQztBQUMzRCxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsR0FBRyxrQ0FBa0MsQ0FBQztBQUN0RSxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsR0FBRyxrQ0FBa0MsQ0FBQztBQUV0RSxjQUFjLGFBQWEsQ0FBQyIsImZpbGUiOiJBcnJvdy5ub2RlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTGljZW5zZWQgdG8gdGhlIEFwYWNoZSBTb2Z0d2FyZSBGb3VuZGF0aW9uIChBU0YpIHVuZGVyIG9uZVxuLy8gb3IgbW9yZSBjb250cmlidXRvciBsaWNlbnNlIGFncmVlbWVudHMuICBTZWUgdGhlIE5PVElDRSBmaWxlXG4vLyBkaXN0cmlidXRlZCB3aXRoIHRoaXMgd29yayBmb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvblxuLy8gcmVnYXJkaW5nIGNvcHlyaWdodCBvd25lcnNoaXAuICBUaGUgQVNGIGxpY2Vuc2VzIHRoaXMgZmlsZVxuLy8gdG8geW91IHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZVxuLy8gXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlXG4vLyB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsXG4vLyBzb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhblxuLy8gXCJBUyBJU1wiIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcbi8vIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuICBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZVxuLy8gc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZCBsaW1pdGF0aW9uc1xuLy8gdW5kZXIgdGhlIExpY2Vuc2UuXG5cbmltcG9ydCBzdHJlYW1BZGFwdGVycyBmcm9tICcuL2lvL2FkYXB0ZXJzJztcbmltcG9ydCB7IFJlY29yZEJhdGNoUmVhZGVyIH0gZnJvbSAnLi9pcGMvcmVhZGVyJztcbmltcG9ydCB7IFJlY29yZEJhdGNoV3JpdGVyIH0gZnJvbSAnLi9pcGMvd3JpdGVyJztcbmltcG9ydCB7IHRvUmVhZGFibGVOb2RlU3RyZWFtIH0gZnJvbSAnLi9pcGMvbm9kZS9pdGVyYWJsZSc7XG5pbXBvcnQgeyByZWNvcmRCYXRjaFJlYWRlclRocm91Z2hOb2RlU3RyZWFtIH0gZnJvbSAnLi9pcGMvbm9kZS9yZWFkZXInO1xuaW1wb3J0IHsgcmVjb3JkQmF0Y2hXcml0ZXJUaHJvdWdoTm9kZVN0cmVhbSB9IGZyb20gJy4vaXBjL25vZGUvd3JpdGVyJztcblxuc3RyZWFtQWRhcHRlcnMudG9SZWFkYWJsZU5vZGVTdHJlYW0gPSB0b1JlYWRhYmxlTm9kZVN0cmVhbTtcblJlY29yZEJhdGNoUmVhZGVyWyd0aHJvdWdoTm9kZSddID0gcmVjb3JkQmF0Y2hSZWFkZXJUaHJvdWdoTm9kZVN0cmVhbTtcblJlY29yZEJhdGNoV3JpdGVyWyd0aHJvdWdoTm9kZSddID0gcmVjb3JkQmF0Y2hXcml0ZXJUaHJvdWdoTm9kZVN0cmVhbTtcblxuZXhwb3J0ICogZnJvbSAnLi9BcnJvdy5kb20nO1xuIl19