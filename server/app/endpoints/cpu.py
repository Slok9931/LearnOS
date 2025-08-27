from fastapi import APIRouter, HTTPException
from app.models.cpu import CPUScheduleRequest
from app.models.response import APIResponse
from app.services.cpu import CPUSchedulerService

router = APIRouter(prefix="/api/cpu", tags=["CPU Scheduling"])

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
                {"name": "MLFQ", "description": "Multi-Level Feedback Queue", "implemented": False}
            ]
        }
    )

@router.post("/test/round-robin/small-quantum")
async def test_round_robin_small_quantum():
    """
    Test Round Robin algorithm with small time quantum (2 units)
    """
    dummy_data = CPUScheduleRequest(
        algo="RoundRobin",
        config={
            "time_quantum": 2.0,
            "context_switch_cost": 0.5,
            "cores": 1
        },
        processes=[
            {"pid": 1, "arrival_time": 0, "burst_time": 8, "priority": 0},
            {"pid": 2, "arrival_time": 1, "burst_time": 4, "priority": 0},
            {"pid": 3, "arrival_time": 2, "burst_time": 6, "priority": 0},
            {"pid": 4, "arrival_time": 3, "burst_time": 3, "priority": 0}
        ]
    )
    
    return await schedule_processes(dummy_data)

@router.post("/test/round-robin/medium-quantum")
async def test_round_robin_medium_quantum():
    """
    Test Round Robin algorithm with medium time quantum (4 units)
    """
    dummy_data = CPUScheduleRequest(
        algo="RoundRobin",
        config={
            "time_quantum": 4.0,
            "context_switch_cost": 0.5,
            "cores": 1
        },
        processes=[
            {"pid": 1, "arrival_time": 0, "burst_time": 8, "priority": 0},
            {"pid": 2, "arrival_time": 1, "burst_time": 4, "priority": 0},
            {"pid": 3, "arrival_time": 2, "burst_time": 6, "priority": 0},
            {"pid": 4, "arrival_time": 3, "burst_time": 3, "priority": 0}
        ]
    )
    
    return await schedule_processes(dummy_data)

@router.post("/test/round-robin/large-quantum")
async def test_round_robin_large_quantum():
    """
    Test Round Robin algorithm with large time quantum (10 units) - behaves like FCFS
    """
    dummy_data = CPUScheduleRequest(
        algo="RoundRobin",
        config={
            "time_quantum": 10.0,
            "context_switch_cost": 0.5,
            "cores": 1
        },
        processes=[
            {"pid": 1, "arrival_time": 0, "burst_time": 8, "priority": 0},
            {"pid": 2, "arrival_time": 1, "burst_time": 4, "priority": 0},
            {"pid": 3, "arrival_time": 2, "burst_time": 6, "priority": 0},
            {"pid": 4, "arrival_time": 3, "burst_time": 3, "priority": 0}
        ]
    )
    
    return await schedule_processes(dummy_data)

@router.post("/test/priority/non-preemptive")
async def test_priority_non_preemptive():
    """
    Test Non-Preemptive Priority algorithm with dummy data
    Lower priority number = Higher priority (0 is highest)
    """
    dummy_data = CPUScheduleRequest(
        algo="Priority",
        config={
            "context_switch_cost": 0.5,
            "cores": 1,
            "preemptive": False
        },
        processes=[
            {"pid": 1, "arrival_time": 0, "burst_time": 8, "priority": 3},
            {"pid": 2, "arrival_time": 1, "burst_time": 4, "priority": 1},
            {"pid": 3, "arrival_time": 2, "burst_time": 2, "priority": 0},
            {"pid": 4, "arrival_time": 3, "burst_time": 1, "priority": 2},
            {"pid": 5, "arrival_time": 4, "burst_time": 3, "priority": 1}
        ]
    )
    
    return await schedule_processes(dummy_data)

@router.post("/test/priority/preemptive")
async def test_priority_preemptive():
    """
    Test Preemptive Priority algorithm with dummy data
    Lower priority number = Higher priority (0 is highest)
    """
    dummy_data = CPUScheduleRequest(
        algo="Priority",
        config={
            "context_switch_cost": 0.5,
            "cores": 1,
            "preemptive": True
        },
        processes=[
            {"pid": 1, "arrival_time": 0, "burst_time": 8, "priority": 3},
            {"pid": 2, "arrival_time": 1, "burst_time": 4, "priority": 1},
            {"pid": 3, "arrival_time": 2, "burst_time": 2, "priority": 0},
            {"pid": 4, "arrival_time": 3, "burst_time": 1, "priority": 2},
            {"pid": 5, "arrival_time": 4, "burst_time": 3, "priority": 1}
        ]
    )
    
    return await schedule_processes(dummy_data)

@router.post("/test/sjf/non-preemptive")
async def test_sjf_non_preemptive():
    """
    Test Non-Preemptive SJF algorithm with dummy data
    """
    dummy_data = CPUScheduleRequest(
        algo="SJF",
        config={
            "context_switch_cost": 0.5,
            "cores": 1,
            "preemptive": False
        },
        processes=[
            {"pid": 1, "arrival_time": 0, "burst_time": 8, "priority": 0},
            {"pid": 2, "arrival_time": 1, "burst_time": 4, "priority": 0},
            {"pid": 3, "arrival_time": 2, "burst_time": 2, "priority": 0},
            {"pid": 4, "arrival_time": 3, "burst_time": 1, "priority": 0},
            {"pid": 5, "arrival_time": 4, "burst_time": 3, "priority": 0}
        ]
    )
    
    return await schedule_processes(dummy_data)

@router.post("/test/sjf/preemptive")
async def test_sjf_preemptive():
    """
    Test Preemptive SJF (SRTF) algorithm with dummy data
    """
    dummy_data = CPUScheduleRequest(
        algo="SJF",
        config={
            "context_switch_cost": 0.5,
            "cores": 1,
            "preemptive": True
        },
        processes=[
            {"pid": 1, "arrival_time": 0, "burst_time": 8, "priority": 0},
            {"pid": 2, "arrival_time": 1, "burst_time": 4, "priority": 0},
            {"pid": 3, "arrival_time": 2, "burst_time": 2, "priority": 0},
            {"pid": 4, "arrival_time": 3, "burst_time": 1, "priority": 0},
            {"pid": 5, "arrival_time": 4, "burst_time": 3, "priority": 0}
        ]
    )
    
    return await schedule_processes(dummy_data)

@router.post("/test/fcfs")
async def test_fcfs():
    """
    Test FCFS algorithm with dummy data
    """
    dummy_data = CPUScheduleRequest(
        algo="FCFS",
        config={
            "context_switch_cost": 1.0,
            "cores": 1
        },
        processes=[
            {"pid": 1, "arrival_time": 0, "burst_time": 8, "priority": 0},
            {"pid": 2, "arrival_time": 1, "burst_time": 4, "priority": 0},
            {"pid": 3, "arrival_time": 2, "burst_time": 9, "priority": 0},
            {"pid": 4, "arrival_time": 3, "burst_time": 5, "priority": 0}
        ]
    )
    
    return await schedule_processes(dummy_data)