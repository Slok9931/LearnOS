import copy
from typing import List, Dict, Tuple, Optional
from app.models.cpu import (
    Process, ScheduleEntry, ProcessResult, SchedulingMetrics, 
    SchedulingResult, SchedulingRequest, MLFQConfig
)

class CPUSchedulingService:
    def __init__(self):
        self.context_switches = 0
        self.total_time = 0
        self.context_switch_cost = 0.5

    def _add_context_switch(self, schedule: List[ScheduleEntry], time: float, 
                           from_process: Optional[int] = None, to_process: Optional[int] = None):
        """Add context switch overhead to schedule"""
        if self.context_switch_cost > 0 and len(schedule) > 0:
            schedule.append(ScheduleEntry(
                process_id=from_process or -1,
                start_time=time,
                end_time=time + self.context_switch_cost,
                type="context_switch"
            ))
            self.context_switches += 1
            return time + self.context_switch_cost
        return time

    def fcfs(self, request: SchedulingRequest) -> SchedulingResult:
        """First Come First Served scheduling"""
        self.context_switch_cost = request.context_switch_cost
        self.context_switches = 0
        
        processes = sorted(request.processes, key=lambda x: x.arrival_time)
        schedule = []
        results = []
        
        current_time = 0
        last_process = None
        
        for process in processes:
            # Wait for process arrival
            if current_time < process.arrival_time:
                current_time = process.arrival_time
            
            # Add context switch if changing processes
            if last_process is not None and last_process != process.id:
                current_time = self._add_context_switch(schedule, current_time, last_process, process.id)
            
            # Execute process
            start_time = current_time
            end_time = current_time + process.burst_time
            
            schedule.append(ScheduleEntry(
                process_id=process.id,
                start_time=start_time,
                end_time=end_time,
                type="execution"
            ))
            
            results.append(ProcessResult(
                pid=process.id,
                arrival_time=process.arrival_time,
                burst_time=process.burst_time,
                priority=process.priority,
                completion_time=end_time,
                turnaround_time=end_time - process.arrival_time,
                waiting_time=start_time - process.arrival_time,
                response_time=start_time - process.arrival_time
            ))
            
            current_time = end_time
            last_process = process.id
        
        self.total_time = current_time
        metrics = self._calculate_metrics(results, current_time)
        
        return SchedulingResult(
            processes=results,
            schedule=schedule,
            metrics=metrics,
            algorithm="FCFS"
        )

    def sjf(self, request: SchedulingRequest) -> SchedulingResult:
        """Shortest Job First scheduling (with preemptive option)"""
        self.context_switch_cost = request.context_switch_cost
        self.context_switches = 0
        
        if request.preemptive:
            return self._srtf(request)
        else:
            return self._sjf_non_preemptive(request)

    def _sjf_non_preemptive(self, request: SchedulingRequest) -> SchedulingResult:
        """Non-preemptive SJF"""
        processes = request.processes.copy()
        schedule = []
        results = []
        
        current_time = 0
        completed = set()
        last_process = None
        
        while len(completed) < len(processes):
            available = [p for p in processes if p.arrival_time <= current_time and p.id not in completed]
            
            if not available:
                next_arrival = min(p.arrival_time for p in processes if p.id not in completed)
                current_time = next_arrival
                continue
            
            selected = min(available, key=lambda x: x.burst_time)
            
            if last_process is not None and last_process != selected.id:
                current_time = self._add_context_switch(schedule, current_time, last_process, selected.id)
            
            start_time = current_time
            end_time = current_time + selected.burst_time
            
            schedule.append(ScheduleEntry(
                process_id=selected.id,
                start_time=start_time,
                end_time=end_time,
                type="execution"
            ))
            
            results.append(ProcessResult(
                pid=selected.id,
                arrival_time=selected.arrival_time,
                burst_time=selected.burst_time,
                priority=selected.priority,
                completion_time=end_time,
                turnaround_time=end_time - selected.arrival_time,
                waiting_time=start_time - selected.arrival_time,
                response_time=start_time - selected.arrival_time
            ))
            
            completed.add(selected.id)
            current_time = end_time
            last_process = selected.id
        
        self.total_time = current_time
        metrics = self._calculate_metrics(results, current_time)
        
        return SchedulingResult(
            processes=results,
            schedule=schedule,
            metrics=metrics,
            algorithm="SJF (Non-preemptive)"
        )

    def _srtf(self, request: SchedulingRequest) -> SchedulingResult:
        """Shortest Remaining Time First (Preemptive SJF)"""
        processes = {p.id: {'process': p, 'remaining': p.burst_time, 'response_time': None} for p in request.processes}
        schedule = []
        results = []
        
        current_time = 0
        last_process = None
        
        while any(p['remaining'] > 0 for p in processes.values()):
            available = [
                (pid, data) for pid, data in processes.items()
                if data['process'].arrival_time <= current_time and data['remaining'] > 0
            ]
            
            if not available:
                next_arrival = min(
                    data['process'].arrival_time for data in processes.values()
                    if data['remaining'] > 0
                )
                current_time = next_arrival
                continue
            
            selected_id, selected_data = min(available, key=lambda x: x[1]['remaining'])
            
            if last_process is not None and last_process != selected_id:
                current_time = self._add_context_switch(schedule, current_time, last_process, selected_id)
            
            if selected_data['response_time'] is None:
                selected_data['response_time'] = current_time - selected_data['process'].arrival_time
            
            next_events = []
            
            completion_time = current_time + selected_data['remaining']
            next_events.append(completion_time)
            
            for pid, data in processes.items():
                if data['process'].arrival_time > current_time and data['remaining'] > 0:
                    next_events.append(data['process'].arrival_time)
            
            next_event = min(next_events) if next_events else completion_time
            execution_time = min(next_event - current_time, selected_data['remaining'])
            
            schedule.append(ScheduleEntry(
                process_id=selected_id,
                start_time=current_time,
                end_time=current_time + execution_time,
                type="execution"
            ))
            
            selected_data['remaining'] -= execution_time
            current_time += execution_time
            
            if selected_data['remaining'] == 0:
                results.append(ProcessResult(
                    pid=selected_id,
                    arrival_time=selected_data['process'].arrival_time,
                    burst_time=selected_data['process'].burst_time,
                    priority=selected_data['process'].priority,
                    completion_time=current_time,
                    turnaround_time=current_time - selected_data['process'].arrival_time,
                    waiting_time=current_time - selected_data['process'].arrival_time - selected_data['process'].burst_time,
                    response_time=selected_data['response_time']
                ))
            
            last_process = selected_id if selected_data['remaining'] > 0 else None
        
        self.total_time = current_time
        metrics = self._calculate_metrics(results, current_time)
        
        return SchedulingResult(
            processes=results,
            schedule=schedule,
            metrics=metrics,
            algorithm="SRTF (Preemptive SJF)"
        )

    def priority_scheduling(self, request: SchedulingRequest) -> SchedulingResult:
        """Priority scheduling with preemptive option and priority type handling"""
        self.context_switch_cost = request.context_switch_cost
        self.context_switches = 0
        
        if request.preemptive:
            return self._priority_preemptive(request)
        else:
            return self._priority_non_preemptive(request)

    def _priority_non_preemptive(self, request: SchedulingRequest) -> SchedulingResult:
        """Non-preemptive Priority Scheduling"""
        processes = request.processes.copy()
        schedule = []
        results = []
        
        current_time = 0
        completed = set()
        last_process = None
        aging_factor = 0
        
        while len(completed) < len(processes):
            available = [p for p in processes if p.arrival_time <= current_time and p.id not in completed]
            
            if not available:
                next_arrival = min(p.arrival_time for p in processes if p.id not in completed)
                current_time = next_arrival
                continue
            
            if request.priority_type == 'dynamic':
                aging_factor = int((current_time) / 10)
            
            selected = min(available, key=lambda x: x.priority - aging_factor)
            
            if last_process is not None and last_process != selected.id:
                current_time = self._add_context_switch(schedule, current_time, last_process, selected.id)
            
            start_time = current_time
            end_time = current_time + selected.burst_time
            
            schedule.append(ScheduleEntry(
                process_id=selected.id,
                start_time=start_time,
                end_time=end_time,
                type="execution"
            ))
            
            results.append(ProcessResult(
                pid=selected.id,
                arrival_time=selected.arrival_time,
                burst_time=selected.burst_time,
                priority=selected.priority,
                completion_time=end_time,
                turnaround_time=end_time - selected.arrival_time,
                waiting_time=start_time - selected.arrival_time,
                response_time=start_time - selected.arrival_time
            ))
            
            completed.add(selected.id)
            current_time = end_time
            last_process = selected.id
        
        self.total_time = current_time
        metrics = self._calculate_metrics(results, current_time)
        
        return SchedulingResult(
            processes=results,
            schedule=schedule,
            metrics=metrics,
            algorithm=f"Priority ({'Dynamic' if request.priority_type == 'dynamic' else 'Fixed'}, Non-preemptive)"
        )

    def round_robin(self, request: SchedulingRequest) -> SchedulingResult:
        """Round Robin scheduling with variations"""
        self.context_switch_cost = request.context_switch_cost
        self.context_switches = 0
        
        if request.rr_variation == 'weighted':
            return self._weighted_round_robin(request)
        elif request.rr_variation == 'deficit':
            return self._deficit_round_robin(request)
        else:
            return self._standard_round_robin(request)

    def _standard_round_robin(self, request: SchedulingRequest) -> SchedulingResult:
        """Standard Round Robin"""
        processes = {p.id: {'process': p, 'remaining': p.burst_time, 'response_time': None} for p in request.processes}
        ready_queue = []
        schedule = []
        results = []
        
        current_time = 0
        last_process = None
        time_quantum = request.time_quantum or 2
        
        for p in sorted(request.processes, key=lambda x: x.arrival_time):
            if p.arrival_time == 0:
                ready_queue.append(p.id)
        
        while ready_queue or any(p['remaining'] > 0 for p in processes.values()):
            for pid, data in processes.items():
                if (data['process'].arrival_time <= current_time and 
                    data['remaining'] > 0 and pid not in ready_queue):
                    ready_queue.append(pid)
            
            if not ready_queue:
                next_arrival = min(
                    data['process'].arrival_time for data in processes.values()
                    if data['remaining'] > 0 and data['process'].arrival_time > current_time
                )
                current_time = next_arrival
                continue
            
            current_process_id = ready_queue.pop(0)
            current_process_data = processes[current_process_id]
            
            if last_process is not None and last_process != current_process_id:
                current_time = self._add_context_switch(schedule, current_time, last_process, current_process_id)
            
            if current_process_data['response_time'] is None:
                current_process_data['response_time'] = current_time - current_process_data['process'].arrival_time
            
            execution_time = min(time_quantum, current_process_data['remaining'])
            
            schedule.append(ScheduleEntry(
                process_id=current_process_id,
                start_time=current_time,
                end_time=current_time + execution_time,
                type="execution"
            ))
            
            current_process_data['remaining'] -= execution_time
            current_time += execution_time
            
            for pid, data in processes.items():
                if (data['process'].arrival_time <= current_time and 
                    data['remaining'] > 0 and pid not in ready_queue and pid != current_process_id):
                    ready_queue.append(pid)
            
            if current_process_data['remaining'] > 0:
                ready_queue.append(current_process_id)
                last_process = current_process_id
            else:
                results.append(ProcessResult(
                    pid=current_process_id,
                    arrival_time=current_process_data['process'].arrival_time,
                    burst_time=current_process_data['process'].burst_time,
                    priority=current_process_data['process'].priority,
                    completion_time=current_time,
                    turnaround_time=current_time - current_process_data['process'].arrival_time,
                    waiting_time=current_time - current_process_data['process'].arrival_time - current_process_data['process'].burst_time,
                    response_time=current_process_data['response_time']
                ))
                last_process = None
        
        self.total_time = current_time
        metrics = self._calculate_metrics(results, current_time)
        
        return SchedulingResult(
            processes=results,
            schedule=schedule,
            metrics=metrics,
            algorithm="Round Robin (Standard)"
        )

    def _weighted_round_robin(self, request: SchedulingRequest) -> SchedulingResult:
        """Weighted Round Robin"""
        base_quantum = request.time_quantum or 2
        weights = request.process_weights or {}
        
        weighted_processes = []
        for p in request.processes:
            weight = weights.get(p.id, 1.0)
            weighted_quantum = int(base_quantum * weight)
            weighted_processes.append((p, weighted_quantum))
        
        processes = {p.id: {'process': p, 'remaining': p.burst_time, 'response_time': None, 'quantum': q} 
                    for p, q in weighted_processes}
        ready_queue = []
        schedule = []
        results = []
        
        current_time = 0
        last_process = None
        
        for p in sorted(request.processes, key=lambda x: x.arrival_time):
            if p.arrival_time == 0:
                ready_queue.append(p.id)
        
        while ready_queue or any(p['remaining'] > 0 for p in processes.values()):
            for pid, data in processes.items():
                if (data['process'].arrival_time <= current_time and 
                    data['remaining'] > 0 and pid not in ready_queue):
                    ready_queue.append(pid)
            
            if not ready_queue:
                next_arrival = min(
                    data['process'].arrival_time for data in processes.values()
                    if data['remaining'] > 0 and data['process'].arrival_time > current_time
                )
                current_time = next_arrival
                continue
            
            current_process_id = ready_queue.pop(0)
            current_process_data = processes[current_process_id]
            
            if last_process is not None and last_process != current_process_id:
                current_time = self._add_context_switch(schedule, current_time, last_process, current_process_id)
            
            if current_process_data['response_time'] is None:
                current_process_data['response_time'] = current_time - current_process_data['process'].arrival_time
            
            execution_time = min(current_process_data['quantum'], current_process_data['remaining'])
            
            schedule.append(ScheduleEntry(
                process_id=current_process_id,
                start_time=current_time,
                end_time=current_time + execution_time,
                type="execution"
            ))
            
            current_process_data['remaining'] -= execution_time
            current_time += execution_time
            
            for pid, data in processes.items():
                if (data['process'].arrival_time <= current_time and 
                    data['remaining'] > 0 and pid not in ready_queue and pid != current_process_id):
                    ready_queue.append(pid)
            
            if current_process_data['remaining'] > 0:
                ready_queue.append(current_process_id)
                last_process = current_process_id
            else:
                results.append(ProcessResult(
                    pid=current_process_id,
                    arrival_time=current_process_data['process'].arrival_time,
                    burst_time=current_process_data['process'].burst_time,
                    priority=current_process_data['process'].priority,
                    completion_time=current_time,
                    turnaround_time=current_time - current_process_data['process'].arrival_time,
                    waiting_time=current_time - current_process_data['process'].arrival_time - current_process_data['process'].burst_time,
                    response_time=current_process_data['response_time']
                ))
                last_process = None
        
        self.total_time = current_time
        metrics = self._calculate_metrics(results, current_time)
        
        return SchedulingResult(
            processes=results,
            schedule=schedule,
            metrics=metrics,
            algorithm="Round Robin (Weighted)"
        )

    def mlfq(self, request: SchedulingRequest) -> SchedulingResult:
        """Multi-Level Feedback Queue with corrected priority handling"""
        self.context_switch_cost = request.context_switch_cost
        self.context_switches = 0
        
        config = request.mlfq_config or MLFQConfig()
        
        queues = [[] for _ in range(config.num_queues)]
        processes = {
            p.id: {
                'process': p, 
                'remaining': p.burst_time, 
                'queue_level': 0,
                'response_time': None,
                'last_execution_time': p.arrival_time,
                'wait_start_time': p.arrival_time,
                'has_run': False
            } 
            for p in request.processes
        }
        
        schedule = []
        results = []
        current_time = 0
        last_process = None
        last_boost_time = 0
        
        for p in sorted(request.processes, key=lambda x: x.arrival_time):
            if p.arrival_time <= current_time:
                queues[0].append(p.id)
                processes[p.id]['wait_start_time'] = current_time

        while any(queues) or any(p['remaining'] > 0 for p in processes.values()):
            for pid, data in processes.items():
                if (data['process'].arrival_time <= current_time and 
                    data['remaining'] > 0 and 
                    not any(pid in queue for queue in queues)):
                    queues[0].append(pid)
                    data['queue_level'] = 0
                    data['wait_start_time'] = current_time

            if (config.priority_boost and config.boost_interval > 0 and 
                current_time >= config.boost_interval and 
                current_time - last_boost_time >= config.boost_interval):
                self._priority_boost_corrected(queues, processes, current_time)
                last_boost_time = current_time

            self._apply_aging_corrected(queues, processes, current_time, config.aging_threshold)

            current_queue_level = None
            for i in range(config.num_queues):
                if queues[i]:
                    current_queue_level = i
                    break

            if current_queue_level is None:
                next_arrivals = [
                    data['process'].arrival_time for data in processes.values()
                    if data['remaining'] > 0 and data['process'].arrival_time > current_time
                ]
                if next_arrivals:
                    current_time = min(next_arrivals)
                    continue
                else:
                    break

            current_process_id = queues[current_queue_level].pop(0)
            current_process_data = processes[current_process_id]

            if last_process is not None and last_process != current_process_id:
                current_time = self._add_context_switch(schedule, current_time, last_process, current_process_id)

            if current_process_data['response_time'] is None:
                current_process_data['response_time'] = current_time - current_process_data['process'].arrival_time

            time_quantum = (config.time_quantums[current_queue_level] 
                           if current_queue_level < len(config.time_quantums) 
                           else config.time_quantums[-1])

            execution_time = min(time_quantum, current_process_data['remaining'])

            schedule.append(ScheduleEntry(
                process_id=current_process_id,
                start_time=current_time,
                end_time=current_time + execution_time,
                type="execution",
                queue_level=current_queue_level
            ))

            current_process_data['remaining'] -= execution_time
            current_process_data['last_execution_time'] = current_time + execution_time
            current_process_data['has_run'] = True
            current_time += execution_time

            print(f"Time {current_time}: Process {current_process_id} executed in queue {current_queue_level} for {execution_time} units")

            for pid, data in processes.items():
                if (data['process'].arrival_time <= current_time and 
                    data['remaining'] > 0 and 
                    not any(pid in queue for queue in queues) and pid != current_process_id):
                    queues[0].append(pid)
                    data['queue_level'] = 0
                    data['wait_start_time'] = current_time

            if current_process_data['remaining'] > 0:
                if (execution_time >= time_quantum and 
                    current_queue_level < config.num_queues - 1):
                    new_queue_level = current_queue_level + 1
                    current_process_data['queue_level'] = new_queue_level
                    current_process_data['wait_start_time'] = current_time
                    queues[new_queue_level].append(current_process_id)
                    
                    print(f"Process {current_process_id} DEMOTED from queue {current_queue_level} to queue {new_queue_level} (used full quantum)")
                else:
                    current_process_data['wait_start_time'] = current_time
                    queues[current_queue_level].append(current_process_id)
                    print(f"Process {current_process_id} stays in queue {current_queue_level} (didn't use full quantum)")

                last_process = current_process_id
            else:
                results.append(ProcessResult(
                    pid=current_process_id,
                    arrival_time=current_process_data['process'].arrival_time,
                    burst_time=current_process_data['process'].burst_time,
                    priority=current_process_data['process'].priority,
                    completion_time=current_time,
                    turnaround_time=current_time - current_process_data['process'].arrival_time,
                    waiting_time=current_time - current_process_data['process'].arrival_time - current_process_data['process'].burst_time,
                    response_time=current_process_data['response_time']
                ))
                print(f"Process {current_process_id} COMPLETED at time {current_time}")
                last_process = None

        self.total_time = current_time
        metrics = self._calculate_metrics(results, current_time)
        
        return SchedulingResult(
            processes=results,
            schedule=schedule,
            metrics=metrics,
            algorithm=f"MLFQ ({config.num_queues} queues, {config.feedback_mechanism} feedback)"
        )

    def _priority_boost_corrected(self, queues: List[List[int]], processes: Dict, current_time: float):
        """Move all processes to highest priority queue"""
        print(f"PRIORITY BOOST triggered at time {current_time} - moving all processes to queue 0")
        moved_count = 0
        for i in range(1, len(queues)):
            while queues[i]:
                pid = queues[i].pop(0)
                processes[pid]['queue_level'] = 0
                processes[pid]['wait_start_time'] = current_time
                queues[0].append(pid)
                moved_count += 1
                print(f"  Process {pid} boosted from queue {i} to queue 0")
        print(f"Total processes boosted: {moved_count}")

    def _apply_aging_corrected(self, queues: List[List[int]], processes: Dict, current_time: float, aging_threshold: int):
        """Apply aging mechanism to promote processes"""
        if aging_threshold <= 0:
            return
            
        for i in range(1, len(queues)):
            promoted_processes = []
            for pid in queues[i][:]:
                process_data = processes[pid]
                
                wait_time = current_time - process_data['wait_start_time']
                
                if wait_time >= aging_threshold:
                    promoted_processes.append(pid)

            for pid in promoted_processes:
                queues[i].remove(pid)
                new_queue_level = max(0, i - 1)
                processes[pid]['queue_level'] = new_queue_level
                processes[pid]['wait_start_time'] = current_time
                queues[new_queue_level].append(pid)
                print(f"Process {pid} PROMOTED from queue {i} to queue {new_queue_level} due to aging (waited {current_time - processes[pid]['wait_start_time']:.1f} units)")

    def _deficit_round_robin(self, request: SchedulingRequest) -> SchedulingResult:
        """Deficit Round Robin implementation"""
        return self._standard_round_robin(request)

    def _calculate_metrics(self, results: List[ProcessResult], total_time: float) -> SchedulingMetrics:
        """Calculate scheduling metrics"""
        if not results:
            return SchedulingMetrics(
                average_waiting_time=0,
                average_turnaround_time=0,
                average_response_time=0,
                cpu_utilization=0,
                throughput=0,
                context_switches=self.context_switches,
                total_time=total_time
            )
        
        total_waiting = sum(p.waiting_time for p in results)
        total_turnaround = sum(p.turnaround_time for p in results)
        total_response = sum(p.response_time or 0 for p in results)
        total_burst = sum(p.burst_time for p in results)
        
        return SchedulingMetrics(
            average_waiting_time=total_waiting / len(results),
            average_turnaround_time=total_turnaround / len(results),
            average_response_time=total_response / len(results),
            cpu_utilization=(total_burst / total_time * 100) if total_time > 0 else 0,
            throughput=len(results) / total_time if total_time > 0 else 0,
            context_switches=self.context_switches,
            total_time=total_time
        )

cpu_service = CPUSchedulingService()