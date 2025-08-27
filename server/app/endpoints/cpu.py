from fastapi import APIRouter, HTTPException
from app.models.cpu import CPUScheduleRequest, MLFQConfig, Process
from app.models.response import APIResponse
from app.services.cpu import CPUSchedulerService

router = APIRouter(prefix="/api/cpu", tags=["CPU Scheduling"])

def convert_request_to_process_objects(request_data: dict):
    """Convert frontend request data to backend Process objects"""
    processes = []
    for process_data in request_data.get('processes', []):
        # Create Process object from dictionary
        process = Process(
            pid=process_data.get('id', process_data.get('pid', 1)),
            arrival_time=process_data.get('arrival_time', 0),
            burst_time=process_data.get('burst_time', 1),
            priority=process_data.get('priority', 0)
        )
        processes.append(process)
    return processes

@router.post("/schedule", response_model=APIResponse)
async def schedule_processes(request: CPUScheduleRequest):
    """
    Schedule processes using the specified algorithm
    """
    try:
        if request.algo == "FCFS":
            result = CPUSchedulerService.fcfs_scheduling(
                processes=request.processes,
                context_switch_cost=request.config.context_switch_cost
            )
        elif request.algo == "SJF":
            result = CPUSchedulerService.sjf_scheduling(
                processes=request.processes,
                context_switch_cost=request.config.context_switch_cost,
                preemptive=request.config.preemptive
            )
        elif request.algo == "Priority":
            result = CPUSchedulerService.priority_scheduling(
                processes=request.processes,
                context_switch_cost=request.config.context_switch_cost,
                preemptive=request.config.preemptive
            )
        elif request.algo == "RoundRobin":
            if not request.config.time_quantum or request.config.time_quantum <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Time quantum must be specified and greater than 0 for Round Robin scheduling"
                )
            result = CPUSchedulerService.round_robin_scheduling(
                processes=request.processes,
                time_quantum=request.config.time_quantum,
                context_switch_cost=request.config.context_switch_cost
            )
        elif request.algo == "MLFQ":
            mlfq_config = request.config.mlfq_config
            if not mlfq_config:
                mlfq_config = MLFQConfig()
            result = CPUSchedulerService.mlfq_scheduling(
                processes=request.processes,
                mlfq_config=mlfq_config,
                context_switch_cost=request.config.context_switch_cost
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Algorithm '{request.algo}' not implemented yet"
            )
        
        return APIResponse(
            success=True,
            message=f"{request.algo} scheduling completed successfully",
            data=result
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/fcfs", response_model=APIResponse)
async def fcfs_scheduling(request: dict):
    """
    FCFS (First Come First Serve) Scheduling Algorithm
    """
    try:
        print(f"FCFS Request received: {request}")
        
        # Convert frontend format to backend Process objects
        processes = convert_request_to_process_objects(request)
        print(f"FCFS Converted processes: {[{'pid': p.pid, 'arrival_time': p.arrival_time, 'burst_time': p.burst_time, 'priority': p.priority} for p in processes]}")
        
        result = CPUSchedulerService.fcfs_scheduling(
            processes=processes,
            context_switch_cost=request.get('context_switch_cost', 0.5)
        )
        
        return APIResponse(
            success=True,
            message="FCFS scheduling completed successfully",
            data=result
        )
    
    except ValueError as e:
        print(f"FCFS ValueError: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"FCFS Exception: {str(e)}")  # Debug log
        import traceback
        print(f"FCFS Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/sjf", response_model=APIResponse)
async def sjf_scheduling(request: dict):
    """
    SJF (Shortest Job First) Scheduling Algorithm
    """
    try:
        print(f"SJF Request received: {request}")
        
        # Convert frontend format to backend Process objects
        processes = convert_request_to_process_objects(request)
        print(f"SJF Converted processes: {[{'pid': p.pid, 'arrival_time': p.arrival_time, 'burst_time': p.burst_time, 'priority': p.priority} for p in processes]}")
        
        result = CPUSchedulerService.sjf_scheduling(
            processes=processes,
            context_switch_cost=request.get('context_switch_cost', 0.5),
            preemptive=request.get('preemptive', False)
        )
        
        return APIResponse(
            success=True,
            message="SJF scheduling completed successfully",
            data=result
        )
    
    except ValueError as e:
        print(f"SJF ValueError: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"SJF Exception: {str(e)}")  # Debug log
        import traceback
        print(f"SJF Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/priority", response_model=APIResponse)
async def priority_scheduling(request: dict):
    """
    Priority Scheduling Algorithm
    """
    try:
        print(f"Priority Request received: {request}")
        
        # Convert frontend format to backend Process objects
        processes = convert_request_to_process_objects(request)
        print(f"Priority Converted processes: {[{'pid': p.pid, 'arrival_time': p.arrival_time, 'burst_time': p.burst_time, 'priority': p.priority} for p in processes]}")
        
        result = CPUSchedulerService.priority_scheduling(
            processes=processes,
            context_switch_cost=request.get('context_switch_cost', 0.5),
            preemptive=request.get('preemptive', False)
        )
        
        return APIResponse(
            success=True,
            message="Priority scheduling completed successfully",
            data=result
        )
    
    except ValueError as e:
        print(f"Priority ValueError: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Priority Exception: {str(e)}")  # Debug log
        import traceback
        print(f"Priority Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/round-robin", response_model=APIResponse)
async def round_robin_scheduling(request: dict):
    """
    Round Robin Scheduling Algorithm
    """
    try:
        print(f"Round Robin Request received: {request}")
        
        time_quantum = request.get('time_quantum')
        if not time_quantum or time_quantum <= 0:
            raise HTTPException(
                status_code=400,
                detail="Time quantum must be specified and greater than 0 for Round Robin scheduling"
            )
        
        # Convert frontend format to backend Process objects
        processes = convert_request_to_process_objects(request)
        print(f"Round Robin Converted processes: {[{'pid': p.pid, 'arrival_time': p.arrival_time, 'burst_time': p.burst_time, 'priority': p.priority} for p in processes]}")
        
        result = CPUSchedulerService.round_robin_scheduling(
            processes=processes,
            time_quantum=time_quantum,
            context_switch_cost=request.get('context_switch_cost', 0.5)
        )
        
        return APIResponse(
            success=True,
            message="Round Robin scheduling completed successfully",
            data=result
        )
    
    except ValueError as e:
        print(f"Round Robin ValueError: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Round Robin Exception: {str(e)}")  # Debug log
        import traceback
        print(f"Round Robin Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/mlfq", response_model=APIResponse)
async def mlfq_scheduling(request: dict):
    """
    MLFQ (Multi-Level Feedback Queue) Scheduling Algorithm
    """
    try:
        print(f"MLFQ Request received: {request}")
        
        # Convert frontend format to backend Process objects
        processes = convert_request_to_process_objects(request)
        print(f"MLFQ Converted processes: {[{'pid': p.pid, 'arrival_time': p.arrival_time, 'burst_time': p.burst_time, 'priority': p.priority} for p in processes]}")
        
        mlfq_config_data = request.get('mlfq_config', {})
        mlfq_config = MLFQConfig(
            num_queues=mlfq_config_data.get('num_queues', 3),
            time_quantums=mlfq_config_data.get('time_quantums', [2.0, 4.0, 8.0]),
            aging_threshold=mlfq_config_data.get('aging_threshold', 10),
            boost_interval=mlfq_config_data.get('boost_interval', 100)
        )
        
        result = CPUSchedulerService.mlfq_scheduling(
            processes=processes,
            mlfq_config=mlfq_config,
            context_switch_cost=request.get('context_switch_cost', 0.5)
        )
        
        return APIResponse(
            success=True,
            message="MLFQ scheduling completed successfully",
            data=result
        )
    
    except ValueError as e:
        print(f"MLFQ ValueError: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"MLFQ Exception: {str(e)}")  # Debug log
        import traceback
        print(f"MLFQ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/algorithms")
async def get_supported_algorithms():
    """
    Get list of supported scheduling algorithms
    """
    return APIResponse(
        success=True,
        message="Supported algorithms retrieved",
        data={
            "algorithms": [
                {"name": "FCFS", "description": "First Come First Serve", "implemented": True},
                {"name": "SJF", "description": "Shortest Job First", "implemented": True},
                {"name": "Priority", "description": "Priority Scheduling", "implemented": True},
                {"name": "RoundRobin", "description": "Round Robin", "implemented": True},
                {"name": "MLFQ", "description": "Multi-Level Feedback Queue", "implemented": True}
            ]
        }
    )