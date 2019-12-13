import * as React from 'react';
import { PureComponent, cloneElement, Children } from 'react';
import { classNames } from '@tolkam/lib-utils-ui';
import { getLongestDuration } from '@tolkam/lib-css-events';

const MOUNTED   = 'MOUNTED';
const ENTERING  = 'ENTERING';
const ENTERED   = 'ENTERED';
const EXITING   = 'EXITING';
const EXITED    = 'EXITED';
const COMPLETED = 'COMPLETED';

export default class Animatable extends PureComponent<Props, State> {

    /**
     * Default props
     * @type Props
     */
    public static defaultProps: Props = {
        show: false,
        classPrefix: 'animatable',
    };

    /**
     * Element reference
     * @type {HTMLElement}
     */
    protected el: HTMLElement;

    /**
     * Current active timeout id
     * @type {number}
     */
    protected timeoutId: number;

    /**
     * @param  {Props}  props
     * @return {void}
     */
    constructor(props: Props) {
        super(props);

        this.state = {
            phase: props.show ? (props.animateAppear ? MOUNTED : ENTERED) : COMPLETED,
        }
    }

    public componentDidMount() {
        const props = this.props;

        if (props.show) {
            if (props.animateAppear) {
                this.begin(true, true);
            } else {
                const onEntered = props.onEntered;
                onEntered && onEntered();
            }
        }
    }

    public componentDidUpdate(prevProps: Props) {
        const show = this.props.show;
        const prevShow = prevProps.show;

        if (show !== prevShow) {
            this.begin(show);
        }
    }

    public componentWillUnmount() {
        clearTimeout(this.timeoutId);
    }

    public render() {
        const that = this;
        const phase = that.state.phase;
        const { children, className, classPrefix, keepMounted } = that.props;
        const child = Children.only(children);
        const currentPhaseClass = classPrefix + '-' + phase.toLowerCase();
        const phaseGroupClass = {};
        phaseGroupClass[classPrefix + '-is-enter'] = [ENTERING, ENTERED].indexOf(phase) >= 0;
        phaseGroupClass[classPrefix + '-is-exit'] = [EXITING, EXITED].indexOf(phase) >= 0;

        if (phase === COMPLETED && !keepMounted) {
            return null;
        }

        return cloneElement(child, {
            ref: (el: any) => that.el = el,
            className: classNames(
                child.props.className,
                className,
                phaseGroupClass,
                currentPhaseClass,
            ),
        });
    }

    /**
     * Begins enter/exit animation
     *
     * @param  {Boolean}  isEnter
     * @param  {Boolean}  noForce
     * @return {void}
     */
    protected begin(isEnter?: boolean, noForce?: boolean) {
        const that = this;
        const currentPhase = that.state.phase;
        const { setPhase, doEnter, doExit } = that;

        if (isEnter) {
            // force required phase to start if phase is wrong
            if (currentPhase !== COMPLETED && noForce === false) {
                setPhase(COMPLETED, doEnter, true);
            } else {
                doEnter();
            }
        } else {
            if (currentPhase !== ENTERED && noForce === false) {
                setPhase(ENTERED, doExit, true);
            } else {
                doExit();
            }
        }
    }

    /**
     * Runs entering phases
     *
     * @return {void}
     */
    protected doEnter = () => {
        const setPhase = this.setPhase;
        setPhase(MOUNTED, () => setPhase(ENTERING, () => setPhase(ENTERED)));
    };

    /**
     * Runs exiting phases
     *
     * @return {void}
     */
    protected doExit = () => {
        const setPhase = this.setPhase;
        setPhase(EXITING, () => setPhase(EXITED, () => setPhase(COMPLETED)));
    };

    /**
     * Sets next phase and executes a callback when done
     *
     * @param {String}   phase
     * @param {Function} done
     * @param {Boolean}  force
     */
    protected setPhase = (phase: string, done?: Function, force?: boolean) => {
        const that = this;
        const userCallback = that.props['on' + phase.charAt(0) + phase.slice(1).toLowerCase()];

        // clear previous active timeout if any
        that.timeoutId && clearTimeout(that.timeoutId);

        that.setState({ phase: phase }, () => {
            const timeout = force ? 0 : getLongestDuration(that.el);

            if(!done) {
                return;
            }

            if(timeout) {
                that.timeoutId = setTimeout(done, timeout);
            } else {
                done();
            }
        });
        userCallback && userCallback();
    }
}

interface Props extends React.HTMLProps<Animatable> {
    show: boolean,
    animateAppear?: boolean,

    // keep element mounted on completed phase
    keepMounted?: boolean,

    // phases classes prefix
    classPrefix?: string,

    // phase callbacks
    onMounted?: Function,
    onEntering?: Function,
    onEntered?: Function,
    onExiting?: Function,
    onExited?: Function,
    onCompleted?: Function,
}

interface State {
    phase: string,
}