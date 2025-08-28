from typing import List
from app.models.cpu import (
    Process, SchedulingRequest, ProcessResult, ScheduleEntry, 
    SchedulingMetrics, SchedulingResult, MLFQConfig
)

class CPUSchedulingService:
    
    @staticmethod
    def fcfs(request: SchedulingRequest) -> SchedulingResult:
        """First Come First Serve scheduling algorithm"""
        processes = sorted(request.processes, key=lambda x: x.arrival_time)
        current_time = 0
        schedule = []
        results = []
        
        for process in processes:
            if current_time < process.arrival_time:
                if current_time < process.arrival_time:
                    schedule.append(ScheduleEntry(
                        process_id=0,
                        start_time=current_time,
                        end_time=process.arrival_time,
                        type="idle"
                    ))
                current_time = process.arrival_time
            
            start_time = current_time
            end_time = current_time + process.burst_time
            
            schedule.append(ScheduleEntry(
                process_id=process.pid,
                start_time=start_time,
                end_time=end_time,
                type="execution"
            ))
            
            waiting_time = start_time - process.arrival_time
            turnaround_time = end_time - process.arrival_time
            
            results.append(ProcessResult(
                pid=process.pid,
                arrival_time=process.arrival_time,
                burst_time=process.burst_time,
                waiting_time=waiting_time,
                turnaround_time=turnaround_time,
                completion_time=end_time,
                priority=process.priority
            ))
            
            current_time = end_time
        
        total_waiting_time = sum(p.waiting_time for p in results)
        total_turnaround_time = sum(p.turnaround_time for p in results)
        total_burst_time = sum(p.burst_time for p in processes)
        
        metrics = SchedulingMetrics(
            average_waiting_time=total_waiting_time / len(results) if results else 0,
            average_turnaround_time=total_turnaround_time / len(results) if results else 0,
            cpu_utilization=(total_burst_time / current_time) * 100 if current_time > 0 else 0,
            throughput=len(results) / current_time if current_time > 0 else 0
        )
        
        return SchedulingResult(
            processes=results,
            schedule=schedule,
            metrics=metrics
        )
    
    @staticmethod
    def sjf(request: SchedulingRequest) -> SchedulingResult:
        """Shortest Job First scheduling algorithm"""
        processes = request.processes.copy()
        current_time = 0
        schedule = []
        results = []
        completed = []
        
        while len(completed) < len(processes):
            available = [p for p in processes if p.arrival_time <= current_time and p.pid not in [c.pid for c in completed]]
            
            if not available:
                next_arrival = min(p.arrival_time for p in processes if p.pid not in [c.pid for c in completed])
                schedule.append(ScheduleEntry(
                    process_id=0,
                    start_time=current_time,
                    end_time=next_arrival,
                    type="idle"
                ))
                current_time = next_arrival
                continue
            
            shortest = min(available, key=lambda x: x.burst_time)
            
            start_time = current_time
            end_time = current_time + shortest.burst_time
            
            schedule.append(ScheduleEntry(
                process_id=shortest.pid,
                start_time=start_time,
                end_time=end_time,
                type="execution"
            ))
            
            waiting_time = start_time - shortest.arrival_time
            turnaround_time = end_time - shortest.arrival_time
            
            results.append(ProcessResult(
                pid=shortest.pid,
                arrival_time=shortest.arrival_time,
                burst_time=shortest.burst_time,
                waiting_time=waiting_time,
                turnaround_time=turnaround_time,
                completion_time=end_time,
                priority=shortest.priority
            ))
            
            completed.append(shortest)
            current_time = end_time
        
        total_waiting_time = sum(p.waiting_time for p in results)
        total_turnaround_time = sum(p.turnaround_time for p in results)
        total_burst_time = sum(p.burst_time for p in processes)
        
        metrics = SchedulingMetrics(
            average_waiting_time=total_waiting_time / len(results) if results else 0,
            average_turnaround_time=total_turnaround_time / len(results) if results else 0,
            cpu_utilization=(total_burst_time / current_time) * 100 if current_time > 0 else 0,
            throughput=len(results) / current_time if current_time > 0 else 0
        )
        
        return SchedulingResult(
            processes=results,
            schedule=schedule,
            metrics=metrics
        )
    
    @staticmethod
    def priority_scheduling(request: SchedulingRequest) -> SchedulingResult:
        """Priority scheduling algorithm (non-preemptive)"""
        processes = request.processes.copy()
        current_time = 0
        schedule = []
        results = []
        completed = []
        
        while len(completed) < len(processes):
            available = [p for p in processes if p.arrival_time <= current_time and p.pid not in [c.pid for c in completed]]
            
            if not available:
                next_arrival = min(p.arrival_time for p in processes if p.pid not in [c.pid for c in completed])
                schedule.append(ScheduleEntry(
                    process_id=0,
                    start_time=current_time,
                    end_time=next_arrival,
                    type="idle"
                ))
                current_time = next_arrival
                continue
            
            highest_priority = min(available, key=lambda x: (x.priority, x.arrival_time))
            
            start_time = current_time
            end_time = current_time + highest_priority.burst_time
            
            schedule.append(ScheduleEntry(
                process_id=highest_priority.pid,
                start_time=start_time,
                end_time=end_time,
                type="execution"
            ))
            
            waiting_time = start_time - highest_priority.arrival_time
            turnaround_time = end_time - highest_priority.arrival_time
            
            results.append(ProcessResult(
                pid=highest_priority.pid,
                arrival_time=highest_priority.arrival_time,
                burst_time=highest_priority.burst_time,
                waiting_time=waiting_time,
                turnaround_time=turnaround_time,
                completion_time=end_time,
                priority=highest_priority.priority
            ))
            
            completed.append(highest_priority)
            current_time = end_time
        
        total_waiting_time = sum(p.waiting_time for p in results)
        total_turnaround_time = sum(p.turnaround_time for p in results)
        total_burst_time = sum(p.burst_time for p in processes)
        
        metrics = SchedulingMetrics(
            average_waiting_time=total_waiting_time / len(results) if results else 0,
            average_turnaround_time=total_turnaround_time / len(results) if results else 0,
            cpu_utilization=(total_burst_time / current_time) * 100 if current_time > 0 else 0,
            throughput=len(results) / current_time if current_time > 0 else 0
        )
        
        return SchedulingResult(
            processes=results,
            schedule=schedule,
            metrics=metrics
        )
    
    @staticmethod
    def round_robin(request: SchedulingRequest) -> SchedulingResult:
        """Round Robin scheduling algorithm"""
        processes = request.processes.copy()
        time_quantum = request.time_quantum or 2.0
        current_time = 0
        schedule = []
        results = []
        queue = []
        remaining_times = {p.pid: p.burst_time for p in processes}
        
        processes.sort(key=lambda x: x.arrival_time)
        process_index = 0
        
        while queue or process_index < len(processes) or any(t > 0 for t in remaining_times.values()):
            while process_index < len(processes) and processes[process_index].arrival_time <= current_time:
                if remaining_times[processes[process_index].pid] > 0:
                    queue.append(processes[process_index])
                process_index += 1
            
            if not queue:
                if process_index < len(processes):
                    next_arrival = processes[process_index].arrival_time
                    schedule.append(ScheduleEntry(
                        process_id=0,
                        start_time=current_time,
                        end_time=next_arrival,
                        type="idle"
                    ))
                    current_time = next_arrival
                    continue
                else:
                    break
            
            current_process = queue.pop(0)
            
            if remaining_times[current_process.pid] <= 0:
                continue
            
            execution_time = min(time_quantum, remaining_times[current_process.pid])
            start_time = current_time
            end_time = current_time + execution_time
            
            schedule.append(ScheduleEntry(
                process_id=current_process.pid,
                start_time=start_time,
                end_time=end_time,
                type="execution"
            ))
            
            remaining_times[current_process.pid] -= execution_time
            current_time = end_time
            
            while process_index < len(processes) and processes[process_index].arrival_time <= current_time:
                if remaining_times[processes[process_index].pid] > 0:
                    queue.append(processes[process_index])
                process_index += 1
            
            if remaining_times[current_process.pid] > 0:
                queue.append(current_process)
            else:
                completion_time = current_time
                waiting_time = completion_time - current_process.arrival_time - current_process.burst_time
                turnaround_time = completion_time - current_process.arrival_time
                
                results.append(ProcessResult(
                    pid=current_process.pid,
                    arrival_time=current_process.arrival_time,
                    burst_time=current_process.burst_time,
                    waiting_time=waiting_time,
                    turnaround_time=turnaround_time,
                    completion_time=completion_time,
                    priority=current_process.priority
                ))
        
        total_waiting_time = sum(p.waiting_time for p in results)
        total_turnaround_time = sum(p.turnaround_time for p in results)
        total_burst_time = sum(p.burst_time for p in processes)
        
        metrics = SchedulingMetrics(
            average_waiting_time=total_waiting_time / len(results) if results else 0,
            average_turnaround_time=total_turnaround_time / len(results) if results else 0,
            cpu_utilization=(total_burst_time / current_time) * 100 if current_time > 0 else 0,
            throughput=len(results) / current_time if current_time > 0 else 0
        )
        
        return SchedulingResult(
            processes=results,
            schedule=schedule,
            metrics=metrics
        )
    
    @staticmethod
    def mlfq(request: SchedulingRequest) -> SchedulingResult:
        """Multi-Level Feedback Queue scheduling algorithm"""
        processes = request.processes.copy()
        mlfq_config = request.mlfq_config or MLFQConfig()
        
        current_time = 0
        schedule = []
        results = []
        
        queues = [[] for _ in range(mlfq_config.num_queues)]
        remaining_times = {p.pid: p.burst_time for p in processes}
        process_queue_level = {p.pid: 0 for p in processes}
        
        processes.sort(key=lambda x: x.arrival_time)
        process_index = 0
        
        while any(queues) or process_index < len(processes) or any(t > 0 for t in remaining_times.values()):
            while process_index < len(processes) and processes[process_index].arrival_time <= current_time:
                if remaining_times[processes[process_index].pid] > 0:
                    queues[0].append(processes[process_index])
                    process_queue_level[processes[process_index].pid] = 0
                process_index += 1
            
            current_queue_level = None
            for i in range(len(queues)):
                if queues[i]:
                    current_queue_level = i
                    break
            
            if current_queue_level is None:
                if process_index < len(processes):
                    next_arrival = processes[process_index].arrival_time
                    schedule.append(ScheduleEntry(
                        process_id=0,
                        start_time=current_time,
                        end_time=next_arrival,
                        type="idle"
                    ))
                    current_time = next_arrival
                    continue
                else:
                    break
            
            current_process = queues[current_queue_level].pop(0)
            
            if remaining_times[current_process.pid] <= 0:
                continue
            
            time_quantum = mlfq_config.time_quantums[min(current_queue_level, len(mlfq_config.time_quantums) - 1)]
            
            execution_time = min(time_quantum, remaining_times[current_process.pid])
            start_time = current_time
            end_time = current_time + execution_time
            
            schedule.append(ScheduleEntry(
                process_id=current_process.pid,
                start_time=start_time,
                end_time=end_time,
                type="execution",
                queue_level=current_queue_level
            ))
            
            remaining_times[current_process.pid] -= execution_time
            current_time = end_time
            
            while process_index < len(processes) and processes[process_index].arrival_time <= current_time:
                if remaining_times[processes[process_index].pid] > 0:
                    queues[0].append(processes[process_index])
                    process_queue_level[processes[process_index].pid] = 0
                process_index += 1
            
            if remaining_times[current_process.pid] > 0:
                next_queue_level = min(current_queue_level + 1, len(queues) - 1)
                queues[next_queue_level].append(current_process)
                process_queue_level[current_process.pid] = next_queue_level
            else:
                completion_time = current_time
                waiting_time = completion_time - current_process.arrival_time - current_process.burst_time
                turnaround_time = completion_time - current_process.arrival_time
                
                results.append(ProcessResult(
                    pid=current_process.pid,
                    arrival_time=current_process.arrival_time,
                    burst_time=current_process.burst_time,
                    waiting_time=waiting_time,
                    turnaround_time=turnaround_time,
                    completion_time=completion_time,
                    priority=current_process.priority
                ))
        
        total_waiting_time = sum(p.waiting_time for p in results)
        total_turnaround_time = sum(p.turnaround_time for p in results)
        total_burst_time = sum(p.burst_time for p in processes)
        
        metrics = SchedulingMetrics(
            average_waiting_time=total_waiting_time / len(results) if results else 0,
            average_turnaround_time=total_turnaround_time / len(results) if results else 0,
            cpu_utilization=(total_burst_time / current_time) * 100 if current_time > 0 else 0,
            throughput=len(results) / current_time if current_time > 0 else 0
        )
        
        return SchedulingResult(
            processes=results,
            schedule=schedule,
            metrics=metrics
        )