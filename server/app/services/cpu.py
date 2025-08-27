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
        current_time = 0
        
        for i, process in enumerate(sorted_processes):
            if current_time < process.arrival_time:
                if current_time > 0:
                    gantt_chart.append({
                        "process": "IDLE",
                        "start": current_time,
                        "end": process.arrival_time
                    })
                current_time = process.arrival_time
            
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