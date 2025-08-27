from typing import List
from app.models.cpu import Process, ProcessResult, CPUScheduleResponse

class CPUSchedulerService:
    
    @staticmethod
    def fcfs_scheduling(processes: List[Process], context_switch_cost: float = 0) -> CPUScheduleResponse:
        """
        First Come First Serve (FCFS) Scheduling Algorithm
        """
        if not processes:
            raise ValueError("No processes provided")
        
        sorted_processes = sorted(processes, key=lambda p: (p.arrival_time, p.pid))
        
        results = []
        gantt_chart = []
        current_time = 0.0
        
        for i, process in enumerate(sorted_processes):
            if current_time < process.arrival_time:
                if current_time > 0:
                    gantt_chart.append({
                        "process": "IDLE",
                        "start": current_time,
                        "end": process.arrival_time
                    })
                current_time = float(process.arrival_time)
            
            if i > 0 and context_switch_cost > 0:
                current_time += context_switch_cost
                gantt_chart.append({
                    "process": "CONTEXT_SWITCH",
                    "start": current_time - context_switch_cost,
                    "end": current_time
                })
            
            start_time = current_time
            completion_time = current_time + process.burst_time
            turnaround_time = completion_time - process.arrival_time
            waiting_time = start_time - process.arrival_time
            response_time = waiting_time
            
            gantt_chart.append({
                "process": f"P{process.pid}",
                "start": start_time,
                "end": completion_time
            })
            
            result = ProcessResult(
                pid=process.pid,
                arrival_time=process.arrival_time,
                burst_time=process.burst_time,
                start_time=start_time,
                completion_time=completion_time,
                turnaround_time=turnaround_time,
                waiting_time=waiting_time,
                response_time=response_time
            )
            results.append(result)
            
            current_time = completion_time
        
        total_processes = len(results)
        avg_waiting_time = sum(r.waiting_time for r in results) / total_processes
        avg_turnaround_time = sum(r.turnaround_time for r in results) / total_processes
        avg_response_time = sum(r.response_time for r in results) / total_processes
        
        total_time = max(r.completion_time for r in results)
        total_burst_time = sum(p.burst_time for p in processes)
        cpu_utilization = (total_burst_time / total_time) * 100 if total_time > 0 else 0
        throughput = total_processes / total_time if total_time > 0 else 0
        
        return CPUScheduleResponse(
            algorithm="FCFS",
            total_processes=total_processes,
            total_time=total_time,
            avg_waiting_time=round(avg_waiting_time, 2),
            avg_turnaround_time=round(avg_turnaround_time, 2),
            avg_response_time=round(avg_response_time, 2),
            cpu_utilization=round(cpu_utilization, 2),
            throughput=round(throughput, 4),
            processes=results,
            gantt_chart=gantt_chart
        )
    
    @staticmethod
    def sjf_scheduling(processes: List[Process], context_switch_cost: float = 0, preemptive: bool = False) -> CPUScheduleResponse:
        """
        Shortest Job First (SJF) Scheduling Algorithm
        Supports both non-preemptive and preemptive (SRTF) versions
        """
        if not processes:
            raise ValueError("No processes provided")
        
        if preemptive:
            return CPUSchedulerService._sjf_preemptive(processes, context_switch_cost)
        else:
            return CPUSchedulerService._sjf_non_preemptive(processes, context_switch_cost)
    
    @staticmethod
    def priority_scheduling(processes: List[Process], context_switch_cost: float = 0, preemptive: bool = False) -> CPUScheduleResponse:
        """
        Priority Scheduling Algorithm
        Supports both non-preemptive and preemptive versions
        Lower priority number = Higher priority (0 is highest priority)
        """
        if not processes:
            raise ValueError("No processes provided")
        
        if preemptive:
            return CPUSchedulerService._priority_preemptive(processes, context_switch_cost)
        else:
            return CPUSchedulerService._priority_non_preemptive(processes, context_switch_cost)
    
    @staticmethod
    def _priority_non_preemptive(processes: List[Process], context_switch_cost: float = 0) -> CPUScheduleResponse:
        """
        Non-preemptive Priority Scheduling
        """
        remaining_processes = processes.copy()
        completed_processes = []
        gantt_chart = []
        current_time = 0.0
        
        while remaining_processes:
            available_processes = [p for p in remaining_processes if p.arrival_time <= current_time]
            
            if not available_processes:
                next_arrival = min(p.arrival_time for p in remaining_processes)
                if current_time > 0:
                    gantt_chart.append({
                        "process": "IDLE",
                        "start": current_time,
                        "end": next_arrival
                    })
                current_time = float(next_arrival)
                continue
            
            selected_process = min(available_processes, key=lambda p: (p.priority, p.arrival_time, p.pid))
            
            if completed_processes and context_switch_cost > 0:
                current_time += context_switch_cost
                gantt_chart.append({
                    "process": "CONTEXT_SWITCH",
                    "start": current_time - context_switch_cost,
                    "end": current_time
                })
            
            start_time = current_time
            completion_time = current_time + selected_process.burst_time
            turnaround_time = completion_time - selected_process.arrival_time
            waiting_time = start_time - selected_process.arrival_time
            response_time = waiting_time
            
            gantt_chart.append({
                "process": f"P{selected_process.pid}",
                "start": start_time,
                "end": completion_time,
                "priority": selected_process.priority
            })
            
            result = ProcessResult(
                pid=selected_process.pid,
                arrival_time=selected_process.arrival_time,
                burst_time=selected_process.burst_time,
                start_time=start_time,
                completion_time=completion_time,
                turnaround_time=turnaround_time,
                waiting_time=waiting_time,
                response_time=response_time
            )
            completed_processes.append(result)
            
            remaining_processes.remove(selected_process)
            current_time = completion_time
        
        total_processes = len(completed_processes)
        avg_waiting_time = sum(r.waiting_time for r in completed_processes) / total_processes
        avg_turnaround_time = sum(r.turnaround_time for r in completed_processes) / total_processes
        avg_response_time = sum(r.response_time for r in completed_processes) / total_processes
        
        total_time = max(r.completion_time for r in completed_processes)
        total_burst_time = sum(p.burst_time for p in processes)
        cpu_utilization = (total_burst_time / total_time) * 100 if total_time > 0 else 0
        throughput = total_processes / total_time if total_time > 0 else 0
        
        return CPUScheduleResponse(
            algorithm="Priority (Non-Preemptive)",
            total_processes=total_processes,
            total_time=total_time,
            avg_waiting_time=round(avg_waiting_time, 2),
            avg_turnaround_time=round(avg_turnaround_time, 2),
            avg_response_time=round(avg_response_time, 2),
            cpu_utilization=round(cpu_utilization, 2),
            throughput=round(throughput, 4),
            processes=completed_processes,
            gantt_chart=gantt_chart
        )
    
    @staticmethod
    def _priority_preemptive(processes: List[Process], context_switch_cost: float = 0) -> CPUScheduleResponse:
        """
        Preemptive Priority Scheduling
        """
        working_processes = []
        for process in processes:
            working_process = Process(
                pid=process.pid,
                arrival_time=process.arrival_time,
                burst_time=process.burst_time,
                priority=process.priority,
                remaining_time=float(process.burst_time)
            )
            working_processes.append(working_process)
        
        completed_processes = []
        gantt_chart = []
        current_time = 0.0
        current_process = None
        process_start_times = {}
        process_response_times = {}
        
        max_time = sum(p.burst_time for p in processes) + max(p.arrival_time for p in processes) + len(processes) * context_switch_cost
        
        while current_time < max_time and len(completed_processes) < len(processes):
            available_processes = [p for p in working_processes if p.arrival_time <= current_time and p.remaining_time > 0]
            
            if not available_processes:
                next_arrivals = [p.arrival_time for p in working_processes if p.arrival_time > current_time and p.remaining_time > 0]
                if not next_arrivals:
                    break
                
                next_time = min(next_arrivals)
                if current_time < next_time:
                    gantt_chart.append({
                        "process": "IDLE",
                        "start": current_time,
                        "end": next_time
                    })
                current_time = next_time
                continue
            
            selected_process = min(available_processes, key=lambda p: (p.priority, p.arrival_time, p.pid))
            
            if current_process and current_process.pid != selected_process.pid:
                if context_switch_cost > 0:
                    gantt_chart.append({
                        "process": "CONTEXT_SWITCH",
                        "start": current_time,
                        "end": current_time + context_switch_cost
                    })
                    current_time += context_switch_cost
            
            if selected_process.pid not in process_response_times:
                process_response_times[selected_process.pid] = current_time - selected_process.arrival_time
                process_start_times[selected_process.pid] = current_time
            
            time_to_completion = selected_process.remaining_time
            
            next_preemption_time = float('inf')
            for p in working_processes:
                if (p.arrival_time > current_time and 
                    p.arrival_time < current_time + time_to_completion and 
                    p.priority < selected_process.priority):
                    next_preemption_time = min(next_preemption_time, p.arrival_time)
            
            execution_time = min(time_to_completion, next_preemption_time - current_time if next_preemption_time != float('inf') else time_to_completion)
            execution_time = max(0.1, execution_time)
            
            gantt_chart.append({
                "process": f"P{selected_process.pid}",
                "start": current_time,
                "end": current_time + execution_time,
                "priority": selected_process.priority
            })
            
            selected_process.remaining_time -= execution_time
            current_time += execution_time
            current_process = selected_process
            
            if selected_process.remaining_time <= 0:
                completion_time = current_time
                turnaround_time = completion_time - selected_process.arrival_time
                waiting_time = turnaround_time - selected_process.burst_time
                response_time = process_response_times[selected_process.pid]
                
                result = ProcessResult(
                    pid=selected_process.pid,
                    arrival_time=selected_process.arrival_time,
                    burst_time=selected_process.burst_time,
                    start_time=process_start_times[selected_process.pid],
                    completion_time=completion_time,
                    turnaround_time=turnaround_time,
                    waiting_time=waiting_time,
                    response_time=response_time
                )
                completed_processes.append(result)
                current_process = None
        
        completed_processes.sort(key=lambda x: x.pid)
        
        total_processes = len(completed_processes)
        avg_waiting_time = sum(r.waiting_time for r in completed_processes) / total_processes
        avg_turnaround_time = sum(r.turnaround_time for r in completed_processes) / total_processes
        avg_response_time = sum(r.response_time for r in completed_processes) / total_processes
        
        total_time = max(r.completion_time for r in completed_processes)
        total_burst_time = sum(p.burst_time for p in processes)
        cpu_utilization = (total_burst_time / total_time) * 100 if total_time > 0 else 0
        throughput = total_processes / total_time if total_time > 0 else 0
        
        return CPUScheduleResponse(
            algorithm="Priority (Preemptive)",
            total_processes=total_processes,
            total_time=total_time,
            avg_waiting_time=round(avg_waiting_time, 2),
            avg_turnaround_time=round(avg_turnaround_time, 2),
            avg_response_time=round(avg_response_time, 2),
            cpu_utilization=round(cpu_utilization, 2),
            throughput=round(throughput, 4),
            processes=completed_processes,
            gantt_chart=gantt_chart
        )

    @staticmethod
    def _sjf_non_preemptive(processes: List[Process], context_switch_cost: float = 0) -> CPUScheduleResponse:
        """
        Non-preemptive SJF Scheduling
        """
        remaining_processes = processes.copy()
        completed_processes = []
        gantt_chart = []
        current_time = 0.0
        
        while remaining_processes:
            available_processes = [p for p in remaining_processes if p.arrival_time <= current_time]
            
            if not available_processes:
                next_arrival = min(p.arrival_time for p in remaining_processes)
                if current_time > 0:
                    gantt_chart.append({
                        "process": "IDLE",
                        "start": current_time,
                        "end": next_arrival
                    })
                current_time = float(next_arrival)
                continue
            
            selected_process = min(available_processes, key=lambda p: (p.burst_time, p.arrival_time, p.pid))
            
            if completed_processes and context_switch_cost > 0:
                current_time += context_switch_cost
                gantt_chart.append({
                    "process": "CONTEXT_SWITCH",
                    "start": current_time - context_switch_cost,
                    "end": current_time
                })
            
            start_time = current_time
            completion_time = current_time + selected_process.burst_time
            turnaround_time = completion_time - selected_process.arrival_time
            waiting_time = start_time - selected_process.arrival_time
            response_time = waiting_time
            
            gantt_chart.append({
                "process": f"P{selected_process.pid}",
                "start": start_time,
                "end": completion_time
            })
            
            result = ProcessResult(
                pid=selected_process.pid,
                arrival_time=selected_process.arrival_time,
                burst_time=selected_process.burst_time,
                start_time=start_time,
                completion_time=completion_time,
                turnaround_time=turnaround_time,
                waiting_time=waiting_time,
                response_time=response_time
            )
            completed_processes.append(result)
            
            remaining_processes.remove(selected_process)
            current_time = completion_time
        
        total_processes = len(completed_processes)
        avg_waiting_time = sum(r.waiting_time for r in completed_processes) / total_processes
        avg_turnaround_time = sum(r.turnaround_time for r in completed_processes) / total_processes
        avg_response_time = sum(r.response_time for r in completed_processes) / total_processes
        
        total_time = max(r.completion_time for r in completed_processes)
        total_burst_time = sum(p.burst_time for p in processes)
        cpu_utilization = (total_burst_time / total_time) * 100 if total_time > 0 else 0
        throughput = total_processes / total_time if total_time > 0 else 0
        
        return CPUScheduleResponse(
            algorithm="SJF (Non-Preemptive)",
            total_processes=total_processes,
            total_time=total_time,
            avg_waiting_time=round(avg_waiting_time, 2),
            avg_turnaround_time=round(avg_turnaround_time, 2),
            avg_response_time=round(avg_response_time, 2),
            cpu_utilization=round(cpu_utilization, 2),
            throughput=round(throughput, 4),
            processes=completed_processes,
            gantt_chart=gantt_chart
        )
    
    @staticmethod
    def _sjf_preemptive(processes: List[Process], context_switch_cost: float = 0) -> CPUScheduleResponse:
        """
        Preemptive SJF (SRTF - Shortest Remaining Time First) Scheduling
        """
        working_processes = []
        for process in processes:
            working_process = Process(
                pid=process.pid,
                arrival_time=process.arrival_time,
                burst_time=process.burst_time,
                priority=process.priority,
                remaining_time=float(process.burst_time)
            )
            working_processes.append(working_process)
        
        completed_processes = []
        gantt_chart = []
        current_time = 0.0
        current_process = None
        process_start_times = {}
        process_response_times = {}
        
        max_time = sum(p.burst_time for p in processes) + max(p.arrival_time for p in processes) + len(processes) * context_switch_cost
        
        while current_time < max_time and len(completed_processes) < len(processes):
            available_processes = [p for p in working_processes if p.arrival_time <= current_time and p.remaining_time > 0]
            
            if not available_processes:
                next_arrivals = [p.arrival_time for p in working_processes if p.arrival_time > current_time and p.remaining_time > 0]
                if not next_arrivals:
                    break
                
                next_time = min(next_arrivals)
                if current_time < next_time:
                    gantt_chart.append({
                        "process": "IDLE",
                        "start": current_time,
                        "end": next_time
                    })
                current_time = next_time
                continue
            
            selected_process = min(available_processes, key=lambda p: (p.remaining_time, p.arrival_time, p.pid))
            
            if current_process and current_process.pid != selected_process.pid:
                if context_switch_cost > 0:
                    gantt_chart.append({
                        "process": "CONTEXT_SWITCH",
                        "start": current_time,
                        "end": current_time + context_switch_cost
                    })
                    current_time += context_switch_cost
            
            if selected_process.pid not in process_response_times:
                process_response_times[selected_process.pid] = current_time - selected_process.arrival_time
                process_start_times[selected_process.pid] = current_time
            
            time_to_completion = selected_process.remaining_time
            
            next_preemption_time = float('inf')
            for p in working_processes:
                if (p.arrival_time > current_time and 
                    p.arrival_time < current_time + time_to_completion and 
                    p.burst_time < selected_process.remaining_time):
                    next_preemption_time = min(next_preemption_time, p.arrival_time)
            
            execution_time = min(time_to_completion, next_preemption_time - current_time if next_preemption_time != float('inf') else time_to_completion)
            execution_time = max(0.1, execution_time)
            
            gantt_chart.append({
                "process": f"P{selected_process.pid}",
                "start": current_time,
                "end": current_time + execution_time
            })
            
            selected_process.remaining_time -= execution_time
            current_time += execution_time
            current_process = selected_process
            
            if selected_process.remaining_time <= 0:
                completion_time = current_time
                turnaround_time = completion_time - selected_process.arrival_time
                waiting_time = turnaround_time - selected_process.burst_time
                response_time = process_response_times[selected_process.pid]
                
                result = ProcessResult(
                    pid=selected_process.pid,
                    arrival_time=selected_process.arrival_time,
                    burst_time=selected_process.burst_time,
                    start_time=process_start_times[selected_process.pid],
                    completion_time=completion_time,
                    turnaround_time=turnaround_time,
                    waiting_time=waiting_time,
                    response_time=response_time
                )
                completed_processes.append(result)
                current_process = None
        
        completed_processes.sort(key=lambda x: x.pid)
        
        total_processes = len(completed_processes)
        avg_waiting_time = sum(r.waiting_time for r in completed_processes) / total_processes
        avg_turnaround_time = sum(r.turnaround_time for r in completed_processes) / total_processes
        avg_response_time = sum(r.response_time for r in completed_processes) / total_processes
        
        total_time = max(r.completion_time for r in completed_processes)
        total_burst_time = sum(p.burst_time for p in processes)
        cpu_utilization = (total_burst_time / total_time) * 100 if total_time > 0 else 0
        throughput = total_processes / total_time if total_time > 0 else 0
        
        return CPUScheduleResponse(
            algorithm="SJF (Preemptive/SRTF)",
            total_processes=total_processes,
            total_time=total_time,
            avg_waiting_time=round(avg_waiting_time, 2),
            avg_turnaround_time=round(avg_turnaround_time, 2),
            avg_response_time=round(avg_response_time, 2),
            cpu_utilization=round(cpu_utilization, 2),
            throughput=round(throughput, 4),
            processes=completed_processes,
            gantt_chart=gantt_chart
        )