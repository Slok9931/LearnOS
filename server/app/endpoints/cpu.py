from fastapi import APIRouter, HTTPException
from app.models.cpu import CPUScheduleRequest, MLFQConfig
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

@router.post("/test/mlfq/default")
async def test_mlfq_default():
    """
    Test MLFQ algorithm with default configuration
    3 queues with time quantums [2, 4, 8]
    """
    dummy_data = CPUScheduleRequest(
        algo="MLFQ",
        config={
            "context_switch_cost": 0.5,
            "cores": 1,
            "mlfq_config": {
                "num_queues": 3,
                "time_quantums": [2.0, 4.0, 8.0],
                "aging_threshold": 10,
                "boost_interval": 100
            }
        },
        processes=[
            {"pid": 1, "arrival_time": 0, "burst_time": 15, "priority": 0},  # Long CPU-bound
            {"pid": 2, "arrival_time": 2, "burst_time": 3, "priority": 0},   # Short I/O-bound
            {"pid": 3, "arrival_time": 4, "burst_time": 8, "priority": 0},   # Medium
            {"pid": 4, "arrival_time": 6, "burst_time": 2, "priority": 0},   # Short I/O-bound
            {"pid": 5, "arrival_time": 8, "burst_time": 12, "priority": 0}   # Long CPU-bound
        ]
    )
    
    return await schedule_processes(dummy_data)

@router.post("/test/mlfq/fast-aging")
async def test_mlfq_fast_aging():
    """
    Test MLFQ algorithm with fast aging to prevent starvation
    """
    dummy_data = CPUScheduleRequest(
        algo="MLFQ",
        config={
            "context_switch_cost": 0.5,
            "cores": 1,
            "mlfq_config": {
                "num_queues": 4,
                "time_quantums": [1.0, 2.0, 4.0, 8.0],
                "aging_threshold": 5,  # Fast aging
                "boost_interval": 50   # Frequent boost
            }
        },
        processes=[
            {"pid": 1, "arrival_time": 0, "burst_time": 20, "priority": 0},
            {"pid": 2, "arrival_time": 1, "burst_time": 3, "priority": 0},
            {"pid": 3, "arrival_time": 2, "burst_time": 6, "priority": 0},
            {"pid": 4, "arrival_time": 3, "burst_time": 2, "priority": 0},
            {"pid": 5, "arrival_time": 4, "burst_time": 10, "priority": 0}
        ]
    )
    
    return await schedule_processes(dummy_data)

@router.post("/test/mlfq/interactive-workload")
async def test_mlfq_interactive_workload():
    """
    Test MLFQ with mixed interactive and CPU-bound workload
    """
    dummy_data = CPUScheduleRequest(
        algo="MLFQ",
        config={
            "context_switch_cost": 0.3,
            "cores": 1,
            "mlfq_config": {
                "num_queues": 3,
                "time_quantums": [1.5, 3.0, 6.0],
                "aging_threshold": 8,
                "boost_interval": 60
            }
        },
        processes=[
            {"pid": 1, "arrival_time": 0, "burst_time": 25, "priority": 0},  # CPU-bound
            {"pid": 2, "arrival_time": 1, "burst_time": 1, "priority": 0},   # Interactive
            {"pid": 3, "arrival_time": 3, "burst_time": 2, "priority": 0},   # Interactive
            {"pid": 4, "arrival_time": 5, "burst_time": 18, "priority": 0},  # CPU-bound
            {"pid": 5, "arrival_time": 7, "burst_time": 1, "priority": 0},   # Interactive
            {"pid": 6, "arrival_time": 9, "burst_time": 3, "priority": 0},   # Interactive
            {"pid": 7, "arrival_time": 11, "burst_time": 15, "priority": 0}  # CPU-bound
        ]
    )
    
    return await schedule_processes(dummy_data)

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