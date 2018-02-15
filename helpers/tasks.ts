/// <reference path="includes.ts"/>
namespace Core {

  const log: Logging.Logger = Logger.get("hawtio-core-tasks");

  export interface Tasks {
    addTask(name: string, task: () => void): void;
    execute(): void;
    reset(): void;
    onComplete(callback: () => void): void;
  }

  export interface ParameterizedTasks extends Tasks {
    addTask(name: string, task: (...params: any[]) => void): void;
    execute(...params: any[]): void;
  }

  export interface TaskMap {
    [name: string]: () => void;
  }

  export interface ParameterizedTaskMap {
    [name: string]: (...params: any[]) => void;
  }

  export class TasksImpl implements Tasks {

    protected tasks: TaskMap = {};
    protected tasksExecuted = false;
    protected onCompleteCallback: () => void = null;

    addTask(name: string, task: () => void): void {
      this.tasks[name] = task;
      if (this.tasksExecuted) {
        this.executeTask(name, task);
      }
    }

    private executeTask(name: string, task: () => void): void {
      if (_.isNull(task)) {
        return;
      }
      log.debug("Executing task:", name);
      try {
        task();
      } catch (error) {
        log.debug("Failed to execute task:", name, "error:", error);
      }
    }

    onComplete(callback: () => void): void {
      this.onCompleteCallback = callback;
    }

    execute(): void {
      if (this.tasksExecuted) {
        return;
      }
      _.forOwn(this.tasks, (task, name) => this.executeTask(name, task));
      this.tasksExecuted = true;
      this.callbackOnComplete();
    }

    protected callbackOnComplete(): void {
      if (!_.isNull(this.onCompleteCallback)) {
        this.onCompleteCallback();
      }
    }

    reset(): void {
      this.tasksExecuted = false;
    }
  }


  export class ParameterizedTasksImpl extends TasksImpl implements ParameterizedTasks {

    protected tasks: ParameterizedTaskMap = {};

    constructor() {
      super();
      this.onComplete(() => this.reset());
    }

    addTask(name: string, task: (...params: any[]) => void): void {
      this.tasks[name] = task;
    }

    execute(...params: any[]): void {
      if (this.tasksExecuted) {
        return;
      }
      _.forOwn(this.tasks, (task, name) => this.executeParameterizedTask(name, task, params));
      this.tasksExecuted = true;
      this.callbackOnComplete();
    }

    private executeParameterizedTask(name: string, task: () => void, params: any[]): void {
      if (_.isNull(task)) {
        return;
      }
      log.debug("Executing task:", name, "with parameters:", params);
      try {
        task.apply(task, params);
      } catch (e) {
        log.debug("Failed to execute task:", name, "error:", e);
      }
    }
  }

  /*
   * These tasks are exported just for convenience of other helper functions.
   * Users should always utilise them via AngularJS dependency injection.
   */
  export const postLoginTasks: Tasks = new Core.TasksImpl();
  export const preLogoutTasks: Tasks = new Core.TasksImpl();
  export const postLogoutTasks: Tasks = new Core.TasksImpl();

}
